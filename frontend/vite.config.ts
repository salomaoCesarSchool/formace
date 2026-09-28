import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend do FORMACE (React + TS + Tailwind).
// O proxy /api -> Spring Boot evita problemas de CORS em desenvolvimento local.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
});
