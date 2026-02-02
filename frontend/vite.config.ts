import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
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
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将React相关库打包成单独chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI组件库单独打包
          'ui-vendor': ['@mui/material', '@mui/icons-material'],
          // 其他第三方库
          'vendor': ['axios', 'dayjs', 'recharts'],
        },
        // chunk文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // chunk大小警告限制
    chunkSizeWarningLimit: 500,
  },
});
