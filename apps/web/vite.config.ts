import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    // Electron 应用使用相对路径
    base: './',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
    },
    define: {
        'process.env': {},
    },
});
