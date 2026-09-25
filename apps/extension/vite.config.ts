import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{outDir:'dist',rollupOptions:{input:{sidepanel:'sidepanel.html',background:'src/background/index.ts',content:'src/content/index.ts'},output:{entryFileNames:'assets/[name].js'}}}});
