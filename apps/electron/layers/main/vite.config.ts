import { defineConfig } from 'vite';
import { resolve } from 'path';
import { builtinModules } from 'module';

const nodeBuiltins = [...builtinModules, ...builtinModules.map((mod) => `node:${mod}`)];

export default defineConfig({
    build: {
        target: 'node22',
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['cjs'],
            fileName: () => 'index.cjs',
        },
        rollupOptions: {
            external: ['@electron-app/claude-agent', '@anthropic-ai/claude-agent-sdk', 'minimax-mcp-js', 'electron', ...nodeBuiltins],
        },
        emptyOutDir: true,
        sourcemap: false,
    },
});
