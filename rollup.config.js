/* eslint-env node */
import { rollupImport, rollupImportMeta } from '@shgysk8zer0/rollup-import';
import { importmap } from '@shgysk8zer0/importmap';
import terser from '@rollup/plugin-terser';

export default {
	input: 'js/index.js',
	plugins: [rollupImport(importmap), rollupImportMeta({ baseURL: 'https://krvbridge.org' })],
	external: [
		'@aegisjsproject/callback-registry/callbackRegistry.js',
		'@aegisjsproject/callback-registry/callbacks.js',
		'@aegisjsproject/callback-registry/events.js',
		'@aegisjsproject/router/router.js',
		'@aegisjsproject/router',
		'@aegisjsproject/state/state.js',
		'@aegisjsproject/state',
	],
	output: {
		file: 'js/index.min.js',
		format: 'esm',
		plugins: [terser()],
		sourcemap: true,
		inlineDynamicImports: true,
	}
};
