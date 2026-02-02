import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '$lib': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  server: {
    port: 3001,
    host: true
  }
}); 