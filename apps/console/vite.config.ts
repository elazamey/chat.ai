import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Canyou console bundles the kernel's own source packages (@aok/contracts,
// @aok/models) directly — no build step for the kernel, no duplicated types.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // يسمح بمضيف المعاينة عبر وكيل Arena (أي نطاق فرعي من e2b.app).
    allowedHosts: ['.e2b.app'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.e2b.app'],
  },
  optimizeDeps: {
    // Linked workspace packages ship TypeScript source; let Vite's pipeline
    // transpile them on demand instead of pre-bundling with esbuild.
    exclude: ['@aok/contracts', '@aok/models'],
  },
});
