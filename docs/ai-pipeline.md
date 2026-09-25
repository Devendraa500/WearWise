# Image generation and ordered fallback

The Node backend prepares a person photograph, the selected product image, optional face reference, category and scene prompt. It returns a job ID immediately while generation runs asynchronously. The extension polls the job; the response includes `provider` and `attempts`.

In auto mode, `FallbackProvider` tries CatVTON locally, Gemini second and OpenAI last. Success stops processing. Missing API keys and unsupported local categories are skipped. Connection errors, service failures and timeouts can fall through; explicit invalid-input/policy refusals do not. Each attempt has a 180-second deadline. Image preparation is bounded and DNS-pins public HTTPS product downloads to avoid private-network access. Redirects are rejected. No provider receives input until images are prepared.

The CatVTON bridge uses the official pipeline and automatic garment mask. Local categories: tops, pants, dresses; background: original only. Gemini and OpenAI accept person/product reference images plus the category prompt and requested background. Outputs are checked for supported format/size and copied to application storage as PNG/JPEG/WebP. The extension displays the successful provider. This is a visualization, not an exact fit guarantee.

`ALLOW_CLOUD_FALLBACK=true` explicitly enables cloud transmission and possible API charges. Keys stay on the backend. `AI_PROVIDER=mock` is a separate demo mode, never an automatic fallback. FASHN remains available explicitly but is not part of the requested chain.

Cancellation aborts the HTTP request and blocks later fallbacks. Already running GPU work can finish; already submitted cloud requests may remain billable. Jobs remain in memory, so a Node restart loses job tracking. Authentication and persistent storage remain separate known limitations of the existing demo backend.

Sources: [CatVTON](https://github.com/Zheng-Chong/CatVTON), [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation), [OpenAI image editing](https://developers.openai.com/api/docs/guides/image-generation). Setup: [local service](../services/catvton/README.md). Verification: [tests and manual checks](provider-testing.md).
