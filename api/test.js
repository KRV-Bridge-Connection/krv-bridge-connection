/* eslint-env node */
import '@shgysk8zer0/polyfills';
import { readFile } from 'node:fs/promises'

export default async () => {
	const url = new URL(import.meta.url);
	const content = await readFile(url.pathname, { encoding: 'utf-8' });
	return new Response([content], { headers: { 'Content-Type': 'text/plain' }});
};
