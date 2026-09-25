import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export function imageData(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || match[2].length > MAX_IMAGE_BYTES * 4 / 3 + 4) throw new Error('INVALID_IMAGE');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1] === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (!valid || bytes.length > MAX_IMAGE_BYTES) throw new Error('INVALID_IMAGE');
  return { mime: match[1], data: match[2], bytes };
}

// Use a DNS-pinned public IPv4 connection; never follow redirects to internal hosts.
export function publicIPv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a,b] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 2) ||
    a === 100 && b >= 64 && b <= 127 || a === 198 && [18,19,51].includes(b) || a === 203 && b === 0);
}
export async function productDataUrl(value: string, signal: AbortSignal): Promise<string> {
  if (value.startsWith('data:')) { imageData(value); return value; }
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw new Error('INVALID_IMAGE_URL');
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(a => !publicIPv4(a.address))) throw new Error('INVALID_IMAGE_URL');
  return new Promise((resolve, reject) => {
    const req = request(url, { signal, family: 4, lookup: (_host, _opts, cb) => cb(null, addresses[0].address, 4) }, res => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error('PRODUCT_IMAGE_UNAVAILABLE')); return; }
      const mime = res.headers['content-type']?.split(';')[0];
      if (!['image/png','image/jpeg','image/webp'].includes(mime || '')) { res.resume(); reject(new Error('INVALID_IMAGE')); return; }
      let size = 0; const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => { size += chunk.length; if (size > MAX_IMAGE_BYTES) req.destroy(new Error('IMAGE_TOO_LARGE')); else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => { try { const data = `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`; imageData(data); resolve(data); } catch(e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(20000, () => req.destroy(new Error('IMAGE_TIMEOUT'))); req.end();
  });
}
