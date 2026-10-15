import { defineConfig } from 'vite';

const frameAncestors = [
  "'self'",
  'https://lagoslife.app',
  'https://www.lagoslife.app',
  'https://naijalife.app',
  'https://www.naijalife.app',
  'https://lagoslife.eliysites.com',
].join(' ');

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    headers: {
      'Content-Security-Policy': `frame-ancestors ${frameAncestors}`,
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    headers: {
      'Content-Security-Policy': `frame-ancestors ${frameAncestors}`,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
