import type { AIProvider } from '../ai.js';
import { imageData } from './images.js';
export type Input = Parameters<AIProvider['generateTryOn']>[0];
export interface ImageAdapter { name: string; available(): boolean; supports(input: Input): boolean; render(input: Input, signal: AbortSignal): Promise<string>; }
export class ProviderError extends Error {
  constructor(public code: string, public retryable = true) { super(code); }
}
async function check(response: Response) {
  if (!response.ok) {
    let code = `PROVIDER_HTTP_${response.status}`;
    try {
      const body = await response.json() as { error?: unknown };
      if (typeof body.error === 'string' && /^[A-Z0-9_]+$/.test(body.error)) code = body.error;
    } catch {
      // Fall back to the HTTP status when a provider returns no JSON body.
    }
    // Policy/invalid-input refusals must not be retried with another provider.
    throw new ProviderError(code, [401,402,403,404,408,429].includes(response.status) || response.status >= 500);
  }
}
export class CatVTONAdapter implements ImageAdapter {
  name = 'catvton'; available() { return true; }
  supports(i: Input) { return ['tops','pants','dresses'].includes(i.category || '') && i.background === 'original'; }
  async render(i: Input, signal: AbortSignal) {
    const url = new URL(process.env.CATVTON_URL || 'http://127.0.0.1:8788');
    if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw new ProviderError('CATVTON_MUST_BE_LOCAL', false);
    const response = await fetch(new URL('/generate',url), {method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({person:i.modelImage,garment:i.productImage,category:i.category})});
    await check(response);
    const result = await response.json() as {image?:string};
    if (!result.image) throw new ProviderError('EMPTY_RESULT');
    imageData(result.image); return result.image;
  }
}
export class GeminiAdapter implements ImageAdapter {
  name = 'gemini'; available() { return Boolean(process.env.GEMINI_API_KEY); } supports() { return true; }
  async render(i: Input, signal: AbortSignal) {
    const images = [i.modelImage,i.productImage,...(i.faceImage ? [i.faceImage] : [])].map(value => {
      const d = imageData(value); return {type:'image',data:d.data,mime_type:d.mime};
    });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {method:'POST',signal,headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY!},body:JSON.stringify({model:process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',input:[{type:'text',text:`Image 1 is the person, image 2 is the exact product, image 3 (if present) is the face reference. ${i.prompt}`},...images],response_format:{type:'image',mime_type:'image/png'}})});
    await check(response);
    const body = await response.json() as {output_image?:{data:string;mime_type?:string};outputs?:{type:string;data?:string;mime_type?:string}[];steps?:{content?:{type:string;data?:string;mime_type?:string}[]}[]};
    const out = body.output_image || body.outputs?.find(x=>x.type==='image' && x.data) || body.steps?.flatMap(s=>s.content || []).find(x=>x.type==='image' && x.data);
    if (!out?.data) throw new ProviderError('NO_IMAGE_OR_REFUSAL',false);
    const data = `data:${out.mime_type || 'image/png'};base64,${out.data}`; imageData(data); return data;
  }
}
export class OpenAIAdapter implements ImageAdapter {
  name = 'openai'; available() { return Boolean(process.env.OPENAI_API_KEY); } supports() { return true; }
  async render(i: Input, signal: AbortSignal) {
    const form = new FormData(); form.append('model',process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2');
    form.append('prompt',`Edit image 1 (the person) with the exact product in image 2. Image 3, if included, is the face reference. ${i.prompt}`);
    form.append('size','1024x1536'); form.append('quality','low'); form.append('output_format','png');
    [i.modelImage,i.productImage,...(i.faceImage ? [i.faceImage] : [])].forEach((value,n)=>{
      const d=imageData(value); form.append('image[]',new Blob([new Uint8Array(d.bytes)],{type:d.mime}),`${n}.${d.mime.split('/')[1]}`);
    });
    const response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',signal,headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form});
    await check(response); const body=await response.json() as {data?:{b64_json?:string}[]};
    const out=body.data?.[0]?.b64_json; if(!out)throw new ProviderError('NO_IMAGE_OR_REFUSAL',false);
    const data=`data:image/png;base64,${out}`; imageData(data); return data;
  }
}
