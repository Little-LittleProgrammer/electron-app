
import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    entries: ['index.ts'],
    clean: true,
    declaration: true,
    rollup: {
        inlineDependencies: true,
        esbuild: {
            target: 'node22',
            platform: 'node',
            minify: true,
        },
    },
});
