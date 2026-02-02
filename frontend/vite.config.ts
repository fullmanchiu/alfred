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
        manualChunks: (id) => {
          // React 相关
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          // Ant Design 相关
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'antd-vendor';
          }
          // 图表库
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('node_modules/plotly.js')) {
            return 'charts-vendor';
          }
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // chunk文件命名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // chunk大小警告限制提高到1000KB
    chunkSizeWarningLimit: 1000,
  },
});
