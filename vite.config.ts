import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Served from https://<user>.github.io/FANGpreparations/ — every asset URL and
  // the router basename derive from this one value.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': '/src' } },
  // pyodide REQUIRED-excluded (esbuild prebundle breaks its asset resolution);
  // sql.js deliberately NOT excluded (CJS, needs the dev prebundle interop)
  optimizeDeps: { exclude: ['pyodide'] },
  worker: { format: 'es' },
  build: { target: 'esnext' },
})
