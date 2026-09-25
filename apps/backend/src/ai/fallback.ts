import { randomUUID } from 'node:crypto';
import type { AIProvider } from '../ai.js';
import { CatVTONAdapter, GeminiAdapter, OpenAIAdapter, ProviderError, type ImageAdapter, type Input } from './adapters.js';
import { imageData, productDataUrl } from './images.js';
type State = Awaited<ReturnType<AIProvider['getGenerationStatus']>>;
export class FallbackProvider implements AIProvider {
  private jobs = new Map<string,{state:State;abort:AbortController}>();
  // First CatVTON use downloads several GB of public model weights. Allow enough
  // time for that one-time setup; subsequent local generations complete sooner.
  constructor(private adapters:ImageAdapter[], private timeout=Number(process.env.TRYON_TIMEOUT_MS || 900000), private prepare=productDataUrl) {}
  async generateTryOn(input:Input) {
    if (this.jobs.size >= 100) throw new Error('GENERATION_CAPACITY_REACHED');
    const providerJobId=randomUUID(), abort=new AbortController();
    const job={state:{status:'QUEUED',attempts:[]} as State,abort}; this.jobs.set(providerJobId,job);
    void this.run(input,job).finally(()=>{const timer=setTimeout(()=>this.jobs.delete(providerJobId),3600000); timer.unref();});
    return {providerJobId};
  }
  private async run(input:Input, job:{state:State;abort:AbortController}) {
    try {
      imageData(input.modelImage); if(input.faceImage)imageData(input.faceImage);
      const prepared={...input,productImage:await this.prepare(input.productImage,AbortSignal.any([job.abort.signal,AbortSignal.timeout(30000)]))};
      let lastErrorCode='ALL_PROVIDERS_UNAVAILABLE';
      for(const adapter of this.adapters) {
        if(job.abort.signal.aborted)return;
        if(!adapter.available() || !adapter.supports(prepared))continue;
        job.state.status='PROCESSING'; job.state.provider=adapter.name; job.state.attempts!.push(adapter.name);
        try {
          const signal=AbortSignal.any([job.abort.signal,AbortSignal.timeout(this.timeout)]);
          const resultUrl=await adapter.render(prepared,signal);
          if(job.abort.signal.aborted)return;
          imageData(resultUrl); job.state={...job.state,status:'COMPLETED',resultUrl}; return;
        } catch(error) {
          if(job.abort.signal.aborted)return;
          if(error instanceof ProviderError)lastErrorCode=error.code;
          if(error instanceof ProviderError && !error.retryable){job.state={...job.state,status:'FAILED',errorCode:error.code};return;}
        }
      }
      job.state={...job.state,status:'FAILED',errorCode:lastErrorCode};
    } catch { if(!job.abort.signal.aborted)job.state={...job.state,status:'FAILED',errorCode:'IMAGE_PREPARATION_FAILED'}; }
  }
  async getGenerationStatus(id:string):Promise<State> {const s=this.jobs.get(id)?.state; return s?{...s,attempts:[...(s.attempts||[])]}:{status:'FAILED',errorCode:'JOB_NOT_FOUND'};}
  async cancelGeneration(id:string) {const job=this.jobs.get(id);if(job && ['QUEUED','PROCESSING'].includes(job.state.status)){job.abort.abort();job.state={...job.state,status:'CANCELLED'};}}
}
export function createFallbackProvider() {
  const adapters:ImageAdapter[]=[new CatVTONAdapter()];
  if(process.env.ALLOW_CLOUD_FALLBACK==='true')adapters.push(new GeminiAdapter(),new OpenAIAdapter());
  return new FallbackProvider(adapters);
}
