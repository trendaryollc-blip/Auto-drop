import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: false },
      format: { comments: false },
    },
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['.'],
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  css: {
    devSourcemap: true,
  },
  plugins: [
    {
      name: 'raw-css-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/css/') && req.url.endsWith('.css')) {
            const filePath = path.join(process.cwd(), req.url);
            if (fs.existsSync(filePath)) {
              const css = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'text/css; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(css);
              return;
            }
          }
          next();
        });
      },
    },
  ],
});
