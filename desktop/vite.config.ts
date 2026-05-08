import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        // Main Process entry
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      {
        // Preload Script entry
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notify the Renderer process to reload when Preload is rebuilt
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
