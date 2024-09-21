import '@shgysk8zer0/polyfills';
import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { readFile } from 'node:fs/promises';

export default createHandler({
	async get(req) {
		try {
			const url = new URL(req.url);

			if (url.searchParams.has('mimes')) {
				const mimes = await import('@shgysk8zer0/consts/mimes.js');
				return Response.json(mimes);
			} else {
				const path = URL.parse(import.meta.url)?.pathname;
				const content = await readFile(path, { encoding: 'utf-8' });
				return new Response([content], { headers: { 'Content-Type': 'text/plain' }});
			}
		} catch(err) {
			console.error(err);
			return Response.error();
		}
	}
});
