import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePluginPreload from 'vite-plugin-preload';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vitePluginPreload(),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // 解决 antd 模块解析问题
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        // 重写路径，确保请求正确转发
        rewrite: (path) => path,
        // WebSocket 支持（用于 SSE）
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending:', req.method, req.url, '->', options.target + proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    // 生产环境优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 代码分割 - 移除 manualChunks，让 Vite 自动处理
    // React.lazy 会自动按需加载页面组件
    rollupOptions: {
      output: {
        // chunk文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // chunk大小警告限制
    chunkSizeWarningLimit: 1000,
  },
});
