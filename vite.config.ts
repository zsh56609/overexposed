import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // itch.io serves HTML5 builds from a relative path. Without this the page is blank (CLAUDE.md §11).
  base: './',
  plugins: [react()],
  // The build's version (round R3: v0.1 was R1's build, v1.0 the jam submission), shown in the credits.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { watch: { ignored: ['**/.npm-cache/**', '**/docs/**', '**/check/out/**', '**/sim/out/**'] } },
});
