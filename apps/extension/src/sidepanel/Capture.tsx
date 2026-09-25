import { useEffect, useRef, useState } from 'react';
import type { CategorySlug } from '@tryon/shared';
import './capture.css';

export function CameraCapture({ close, usePhoto, actionLabel = 'Use photo & try on' }: { close: () => void; usePhoto: (image: string) => Promise<void>; actionLabel?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream>();
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    setError(''); setReady(false);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(media => {
        if (disposed) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media;
        if (video.current) video.current.srcObject = media;
      }).catch(e => setError(e.name==='NotAllowedError' ? 'Camera permission is blocked or could not be requested in the sidepanel. Open Camera permissions below, allow access, then return here and retry.' : e.name==='NotFoundError' ? 'No camera was found. Connect a camera and retry.' : 'Camera unavailable. Close other apps using it, then retry.'));
    return () => { disposed = true; stream.current?.getTracks().forEach(t => t.stop()); };
  }, [attempt]);
  function capture() {
    const source = video.current;
    if (!source?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext('2d')!.drawImage(source, 0, 0);
    setPhoto(canvas.toDataURL('image/jpeg', .92));
  }
  return <section className="capture-panel" aria-label="Camera photograph">
    <h2>Take your try-on photo</h2>
    <p>Step back until your whole body is visible. Use good lighting and face the camera. This photo is used for this try-on only.</p>
    {error && <><p role="alert">{error}</p><div className="capture-actions"><button className="outline" onClick={()=>chrome.tabs.create({url:chrome.runtime.getURL('camera-permission.html')})}>Camera permissions</button><button className="outline" onClick={()=>setAttempt(a=>a+1)}>Retry camera</button></div></>}
    <video ref={video} autoPlay muted playsInline hidden={Boolean(photo)} onLoadedData={() => setReady(true)} />
    {photo && <img src={photo} alt="Your captured photo" />}
    <div className="capture-actions">
      {!photo ? <button className="primary" disabled={!ready} onClick={capture}>Capture photo</button> : <>
        <button className="outline" disabled={saving} onClick={() => setPhoto('')}>Retake</button>
        <button className="primary" disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await usePhoto(photo); stream.current?.getTracks().forEach(t => t.stop()); close(); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } }}>{actionLabel}</button>
      </>}
      <button className="outline" disabled={saving} onClick={close}>Cancel</button>
    </div>
  </section>;
}

export function ImageCrop({ screenshot, close, select }: { screenshot: string; close: () => void; select: (image: string, category: CategorySlug) => void }) {
  const image = useRef<HTMLImageElement>(null);
  const [from, setFrom] = useState<{ x: number; y: number }>();
  const [to, setTo] = useState<{ x: number; y: number }>();
  const [category, setCategory] = useState<CategorySlug>('tops');
  const [error, setError] = useState('');
  const point = (e: React.PointerEvent) => {
    const rect = image.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) };
  };
  const box = from && to ? { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), w: Math.abs(from.x - to.x), h: Math.abs(from.y - to.y) } : null;
  function crop() {
    if (!box || !image.current) return;
    const source = image.current;
    const width = Math.round(box.w * source.naturalWidth), height = Math.round(box.h * source.naturalHeight);
    if (width < 64 || height < 64) { setError('Select a larger area, at least 64 × 64 pixels.'); return; }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1536 / Math.max(width, height));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    canvas.getContext('2d')!.drawImage(source, box.x * source.naturalWidth, box.y * source.naturalHeight, width, height, 0, 0, canvas.width, canvas.height);
    select(canvas.toDataURL('image/jpeg', .92), category);
  }
  return <section className="capture-panel" aria-label="Select clothing from page">
    <h2>Select clothing</h2><p>Drag a rectangle around the clothing in this screenshot. Only the crop will be sent for your try-on.</p>
    <div className="crop-stage" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const p = point(e); setFrom(p); setTo(p); setError(''); }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setTo(point(e)); }} onPointerUp={e => { setTo(point(e)); if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}>
      <img ref={image} src={screenshot} draggable={false} alt="Current shopping page. Drag to select clothing." />
      {box && <div className="crop-box" style={{ left: `${box.x*100}%`, top: `${box.y*100}%`, width: `${box.w*100}%`, height: `${box.h*100}%` }} />}
    </div>
    <label>Clothing type <select value={category} onChange={e => setCategory(e.target.value as CategorySlug)}><option value="tops">T-shirt / top / jacket</option><option value="pants">Pants / trousers</option><option value="dresses">Dress</option></select></label>
    {error && <p role="alert">{error}</p>}
    <div className="capture-actions"><button className="primary" disabled={!box?.w || !box.h} onClick={crop}>Use selected clothing</button><button className="outline" onClick={close}>Cancel</button></div>
  </section>;
}
