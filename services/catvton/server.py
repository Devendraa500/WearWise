"""Loopback-only CatVTON bridge. Run in the CatVTON Python environment."""
import base64
import io
import json
import os
from pathlib import Path
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VENDOR = Path(__file__).parent / 'vendor' / 'CatVTON'
sys.path.insert(0, str(VENDOR))
LOCK = threading.Lock()
MAX_BODY = 36 * 1024 * 1024
PIPELINE = MASKER = None
LAST_ERROR_CODE = None


def decode_image(value):
    from PIL import Image, ImageOps
    if not isinstance(value, str) or not value.startswith(('data:image/png;base64,', 'data:image/jpeg;base64,', 'data:image/webp;base64,')):
        raise ValueError('INVALID_IMAGE')
    raw = base64.b64decode(value.split(',', 1)[1], validate=True)
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError('IMAGE_TOO_LARGE')
    image = Image.open(io.BytesIO(raw))
    if image.width * image.height > 25_000_000 or min(image.size) < 64:
        raise ValueError('INVALID_DIMENSIONS')
    return ImageOps.exif_transpose(image).convert('RGB')


def generate(payload):
    global PIPELINE, MASKER
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError('CUDA_UNAVAILABLE')
    from huggingface_hub import snapshot_download
    from diffusers.image_processor import VaeImageProcessor
    from model.cloth_masker import AutoMasker
    from model.pipeline import CatVTONPipeline
    from utils import resize_and_crop, resize_and_padding
    category = {'tops': 'upper', 'pants': 'lower', 'dresses': 'overall'}.get(payload.get('category'))
    if category is None:
        raise ValueError('UNSUPPORTED_CATEGORY')
    person, garment = decode_image(payload['person']), decode_image(payload['garment'])
    if PIPELINE is None:
        checkpoint = snapshot_download(repo_id='zhengchong/CatVTON')
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        pipeline = CatVTONPipeline(
            base_ckpt=os.getenv('CATVTON_BASE_MODEL', 'booksforcharlie/stable-diffusion-inpainting'),
            attn_ckpt=checkpoint, attn_ckpt_version='mix', weight_dtype=dtype,
            use_tf32=torch.cuda.is_bf16_supported(), device='cuda')
        masker = AutoMasker(densepose_ckpt=str(Path(checkpoint) / 'DensePose'),
                            schp_ckpt=str(Path(checkpoint) / 'SCHP'), device='cuda')
        PIPELINE, MASKER = pipeline, masker
    # RTX 4050 laptops usually have 6 GB VRAM. Start with 512×768 and increase
    # only after a successful run. CatVTON's upstream 768×1024 preset needs more.
    size = (int(os.getenv('CATVTON_WIDTH', '512')), int(os.getenv('CATVTON_HEIGHT', '768')))
    person = resize_and_crop(person, size)
    garment = resize_and_padding(garment, size)
    mask = MASKER(person, category)['mask']
    processor = VaeImageProcessor(vae_scale_factor=8, do_normalize=False,
                                 do_binarize=True, do_convert_grayscale=True)
    mask = processor.blur(mask, blur_factor=9)
    with torch.inference_mode():
        output = PIPELINE(image=person, condition_image=garment, mask=mask,
                          num_inference_steps=int(os.getenv('CATVTON_STEPS', '25')),
                          guidance_scale=float(os.getenv('CATVTON_GUIDANCE', '2.5')),
                          generator=torch.Generator(device='cuda').manual_seed(42))[0]
    buffer = io.BytesIO()
    output.save(buffer, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode('ascii')


def diagnostic_code(error):
    """Return a safe diagnostic code; request images are never included."""
    message = str(error).lower()
    if 'out of memory' in message:
        return 'CATVTON_GPU_OUT_OF_MEMORY'
    if 'detectron2' in message or 'densepose' in message:
        return 'CATVTON_MASKING_RUNTIME_ERROR'
    if isinstance(error, (ImportError, ModuleNotFoundError)):
        return 'CATVTON_DEPENDENCY_ERROR'
    if 'huggingface' in message or 'snapshot' in message or 'download' in message:
        return 'CATVTON_MODEL_DOWNLOAD_ERROR'
    return 'CATVTON_INITIALIZATION_ERROR'


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log photographs or request bodies.

    def reply(self, code, payload):
        data = json.dumps(payload).encode()
        try:
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Client cancelled. GPU inference may finish but no output is retained.

    def do_GET(self):
        if self.path != '/health':
            return self.reply(404, {'error': 'NOT_FOUND'})
        try:
            import torch
            ready = torch.cuda.is_available() and VENDOR.is_dir()
            self.reply(200 if ready else 503, {'cuda': ready, 'loaded': PIPELINE is not None, 'last_error': LAST_ERROR_CODE})
        except ImportError:
            self.reply(503, {'error': 'DEPENDENCIES_NOT_INSTALLED'})

    def do_POST(self):
        global LAST_ERROR_CODE
        if self.path != '/generate':
            return self.reply(404, {'error': 'NOT_FOUND'})
        if self.headers.get('Origin') or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(403, {'error': 'BACKEND_ONLY'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY:
                return self.reply(413, {'error': 'INVALID_BODY_SIZE'})
            if not LOCK.acquire(blocking=False):
                return self.reply(503, {'error': 'GPU_BUSY'})
            try:
                self.connection.settimeout(30)
                payload = json.loads(self.rfile.read(length))
                self.reply(200, {'image': generate(payload)})
                LAST_ERROR_CODE = None
            finally:
                LOCK.release()
        except (ValueError, KeyError, TypeError):
            self.reply(400, {'error': 'INVALID_INPUT'})
        except Exception as error:
            LAST_ERROR_CODE = diagnostic_code(error)
            # Do not log request data: it contains the user's private images.
            print(f'CatVTON failed [{LAST_ERROR_CODE}]: {type(error).__name__}: {error}', file=sys.stderr)
            self.reply(503, {'error': LAST_ERROR_CODE})


if __name__ == '__main__':
    print('CatVTON bridge: http://127.0.0.1:8788 (models load on first generation)')
    ThreadingHTTPServer(('127.0.0.1', 8788), Handler).serve_forever()
