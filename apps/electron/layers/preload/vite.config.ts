import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['cjs'],
            fileName: () => 'index.cjs',
        },
        rollupOptions: {
            external: ['electron', '@anthropic-ai/claude-agent'],
        },
        emptyOutDir: true,
        sourcemap: false,
    },
});
