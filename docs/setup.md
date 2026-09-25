# Setup

Copy `.env.example` to `.env`, run `npm install`, then `npm run dev`. Open the backend health route at `http://localhost:8787/api/health`. Build the extension with `npm run build:extension` and load `apps/extension/dist` from Chrome’s extension developer page. The prototype uses in-memory records for the credential-free demo; `prisma/schema.prisma` provides the production PostgreSQL persistence model.
