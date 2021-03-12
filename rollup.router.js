import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import externals from 'rollup-plugin-node-externals';
import json from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';

const LOCAL_EXTERNALS = [];
const NPM_EXTERNALS = [];

const generateConfig = (input) => ({
  input: `./src/microapps-router/${input.filename}.ts`,
  output: {
    file: `./distb/microapps-router/${input.filename}${input.minify ? '' : '.max'}.js`,
    format: 'cjs',
  },
  plugins: [
    json(),
    commonjs(),
    externals({}),
    nodeResolve(),
    typescript({
      tsconfig: 'tsconfig.bundle-router.json',
    }),
    input.minify
      ? terser({
          compress: true,
          mangle: true,
          output: { comments: false }, // Remove all comments, which is fine as the handler code is not distributed.
        })
      : undefined,
  ],
  external: [...NPM_EXTERNALS, ...LOCAL_EXTERNALS],
  inlineDynamicImports: true,
});

export default [
  { filename: 'index', minify: false },
  { filename: 'index', minify: true },
].map(generateConfig);
