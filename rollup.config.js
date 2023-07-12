/* eslint-env node */
import { getConfig } from '@shgysk8zer0/js-utils/rollup';
import { rollupImport, rollupImportMeta } from '@shgysk8zer0/rollup-import';
import { importmap } from '@shgysk8zer0/importmap';

export default getConfig('./js/index.js', {
	plugins: [
		rollupImport(importmap),
		rollupImportMeta({ baseURL: 'https://dev.kernvalley.us/' }),
	],
	format: 'iife',
	minify: true,
	sourcemap: true,
});
