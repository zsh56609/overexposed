import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // itch.io serves HTML5 builds from a relative path. Without this the page is blank (CLAUDE.md §11).
  base: './',
  plugins: [react()],
});
