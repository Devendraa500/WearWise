# Provider verification

`npm run test` tests local success, ordered service-error fallback, missing credentials, cancellation, terminal refusals, capability routing, adapter payloads and private-address rejection without GPU inference or external billing. `npm run build` and `npm run lint` compile/type-check the integration.

To verify on the actual workstation after its GPU recovers:

1. Follow `services/catvton/README.md`; confirm `/health` reports CUDA available.
2. Run with `AI_PROVIDER=auto` and `ALLOW_CLOUD_FALLBACK=false`. Upload your photos and select a top with original background. Confirm the result shows `catvton`.
3. Enable cloud fallback with your own funded keys. Stop the local service; generate once and confirm `gemini`.
4. Leave the Gemini key empty; generate once and confirm `openai`.
5. Remove both keys with the local service stopped. Confirm a clear failure rather than a mock image.

Steps 3–4 incur provider charges and send the selected images externally. They have not been executed here. Actual CatVTON inference is blocked by `nvidia-smi` reporting the device is lost. Unit tests validate the adapters with controlled API-shaped responses, not image quality or account access.
