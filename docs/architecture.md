# Architecture

The extension has three isolated parts: the Side Panel UI, a MV3 service worker that opens it, and a content script. The UI asks the content script to inspect only the current page. It then sends a selected normalized product to the Fastify API. The API owns file bytes, category requirements and provider calls; browser code never receives secret credentials.

`Profile → required assets → selected product image → category prompt → AIProvider → private result` is the try-on pipeline. Job states are `CREATED`, `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, and `CANCELLED`; the demo UI polls jobs rather than inventing percentages.
