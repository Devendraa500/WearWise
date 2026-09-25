# Local CatVTON service

The bridge uses the official CatVTON pipeline and AutoMasker, with one GPU inference at a time. Inputs and outputs remain in memory. Supports tops, pants and dresses with the original scene. Shoes, jewellery, accessories, and scene changes are routed to configured cloud fallbacks.

For the RTX 4050 6 GB laptop GPU detected on this workstation, use the default 512×768 resolution, 25 steps. Set `CATVTON_WIDTH=768` and `CATVTON_HEIGHT=1024` only if a successful 512×768 generation leaves enough VRAM. CatVTON's upstream 1024×768 estimate is below 8 GB VRAM, so the higher preset may exhaust 6 GB.

## Windows setup

First run `nvidia-smi`. On this computer it currently reports **GPU is lost; reboot the system to recover this GPU**. Reboot Windows and verify the GPU is visible before installing CUDA dependencies. This project does not restart your computer automatically.

Use an isolated Python 3.10 environment. WSL2 with NVIDIA CUDA support is recommended because CatVTON's DensePose dependencies can be difficult to install on native Windows. Run from the repository root inside that environment:

```bash
# Source is already downloaded on this workstation. For a fresh checkout:
git clone https://github.com/Zheng-Chong/CatVTON.git services/catvton/vendor/CatVTON
git -C services/catvton/vendor/CatVTON checkout 7818397f25613beedb3d861a34769f607cfcf3b1
python3.10 -m venv services/catvton/.venv
source services/catvton/.venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r services/catvton/requirements-windows.txt
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
python services/catvton/server.py
```

For a native Windows Python environment, activation is `services\catvton\.venv\Scripts\Activate.ps1`. Use `requirements-windows.txt`, not the upstream `vendor/CatVTON/requirements.txt`: upstream tracks Diffusers from Git and now conflicts with CatVTON's pinned Transformers version. If PyTorch reports no CUDA, install the CUDA build suitable for the driver using the official PyTorch installation selector: https://pytorch.org/get-started/locally/ . Do not use a CPU-only wheel for local try-on.

CatVTON's bundled DensePose/Detectron2 components originate from Linux builds, so native Windows can require a local C++/CUDA build and may fail after the Python packages have installed. WSL2 with NVIDIA CUDA is the supported practical route if that happens. The bridge stays the same; start it from the Linux workspace and ensure the Windows backend can reach `http://localhost:8788/health`.

First generation downloads multi-GB model and segmentation weights from Hugging Face. Warm up locally before a demonstration; downloads may outlast the backend's per-provider timeout. The service continues initialization even if that first HTTP request times out. Model weights are cached by Hugging Face, not committed. Validate `/health` from the Windows backend host if using WSL; it must be reachable at `http://localhost:8788/health`. The bridge binds only to loopback, so WSL networking must forward localhost (or run the Node backend in the same WSL environment).

## Run the application

In the root `.env`, set `AI_PROVIDER=auto`. Start this bridge in one terminal, and `npm run dev -w @tryon/backend` in another. Build/load the extension normally.

Cloud fallback is disabled until `ALLOW_CLOUD_FALLBACK=true`; enabling it allows photographs to be sent to Gemini and then OpenAI, potentially incurring charges. Missing keys are skipped. `GEMINI_API_KEY` and `OPENAI_API_KEY` remain on the backend. Mock results are available only when explicitly selecting `AI_PROVIDER=mock`.

## Verification limits

The bridge has been syntax-checked; actual CUDA inference has not been verified on this workstation because the GPU driver cannot currently access the device. Dependency installation and model downloads remain setup steps. Unit tests for provider ordering use controlled responses, not a real GPU or paid APIs.

## Attribution

CatVTON: Zheng Chong et al., “CatVTON: Concatenation Is All You Need for Virtual Try-On with Diffusion Models”, ICLR 2025. Official source: https://github.com/Zheng-Chong/CatVTON . Code/checkpoints are CC BY-NC-SA 4.0; comply with attribution and share-alike requirements for non-commercial academic use. Upstream source is downloaded separately and retains its license. Check its README for the latest environment troubleshooting guidance.
