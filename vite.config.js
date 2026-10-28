import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Permite que funcione tanto en localhost como en GitHub Pages o subdirectorios
  server: {
    port: 3000,
    host: true
  }
});
