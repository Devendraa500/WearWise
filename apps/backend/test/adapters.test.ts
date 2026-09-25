import { afterEach,describe,it,expect,vi } from 'vitest';
import { CatVTONAdapter,GeminiAdapter,OpenAIAdapter,type Input } from '../src/ai/adapters.js';
const raw='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
const png=`data:image/png;base64,${raw}`;
const input:Input={modelImage:png,productImage:png,category:'tops',background:'original',prompt:'Preserve the exact product.'};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('adapter contracts',()=>{
  it('routes only supported clothing/original scene to CatVTON',()=>{const c=new CatVTONAdapter();expect(c.supports(input)).toBe(true);expect(c.supports({...input,category:'shoes'})).toBe(false);expect(c.supports({...input,background:'studio'})).toBe(false);});
  it('sends two references to Gemini and reads documented output steps',async()=>{vi.stubEnv('GEMINI_API_KEY','test');const call=vi.fn(async()=>new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'image',mime_type:'image/png',data:raw}]}]})));vi.stubGlobal('fetch',call);expect(await new GeminiAdapter().render(input,new AbortController().signal)).toBe(png);const init=(call.mock.calls as unknown as [string,RequestInit][])[0][1];const body=JSON.parse(init.body as string);expect(body.input.filter((p:{type:string})=>p.type==='image')).toHaveLength(2);expect(init.headers).toMatchObject({'x-goog-api-key':'test'});});
  it('sends person and product as OpenAI multipart edits',async()=>{vi.stubEnv('OPENAI_API_KEY','test');const call=vi.fn(async()=>new Response(JSON.stringify({data:[{b64_json:raw}]})));vi.stubGlobal('fetch',call);expect(await new OpenAIAdapter().render(input,new AbortController().signal)).toBe(png);const init=(call.mock.calls as unknown as [string,RequestInit][])[0][1];expect((init.body as FormData).getAll('image[]')).toHaveLength(2);});
});
