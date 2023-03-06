import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import pluginjson from '@rollup/plugin-json';
import { terser } from 'rollup-plugin-terser';
import polyfil from 'rollup-plugin-polyfill-node';
import typescript from '@rollup/plugin-typescript';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/Main.ts',
  output: {
    file: 'prod/bundle.js',
    format: 'iife', // immediately-invoked function expression — suitable for <script> tags
    sourcemap: false
  },
  plugins: [
    resolve({
      browser: true
    }), // tells Rollup how to find date-fns in node_modules
    commonjs(), // converts date-fns to ES modules
    pluginjson(),
    polyfil(),
    typescript(),
    production && terser() // minify, but only in production
  ],

};
