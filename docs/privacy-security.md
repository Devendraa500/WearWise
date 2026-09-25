# Privacy and security

The extension contains no API or storage secret. The API validates JSON with Zod, limits uploads to 8 MB, accepts JPEG/PNG/WebP only, uses Helmet, rate limits requests and constrains CORS to localhost/extension origins. Storage keys are random and files are served through an application route, not exposed as public storage URLs. Profile deletion removes stored photos and in-memory job/result metadata.

For production: use HTTPS, authenticated sessions/JWT verification, PostgreSQL migrations, signed expiring object-store URLs, server-side image decoding/dimension checks, audit logging that never contains image bytes, SSRF-safe external image fetch validation, and a precise extension host allowlist. This project does not train on user images.
