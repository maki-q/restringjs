import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'adapters/index': 'src/adapters/index.ts',
      'server/index': 'src/server/index.ts',
      'cli/index': 'src/cli/index.ts',
      'cli/bin': 'src/cli/bin.ts',
      'config/index': 'src/config/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom', 'ts-morph'],
    outDir: 'dist',
  },
]);
