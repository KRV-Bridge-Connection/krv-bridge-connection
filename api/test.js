import { createHandler } from '@shgysk8zer0/lambda-http';
import { readFile } from 'node:fs/promises';


export default createHandler({
	async get() {
		try {
			if (! (URL.parse instanceof Function)) {
				URL.parse = function parse(url, base) {
					try {
						return new URL(url, base);
					} catch {
						return null;
					}
				};
			}

			const path = URL.parse(import.meta.url)?.pathname;
			const content = await readFile(path, { encoding: 'utf-8' });
			return new Response([content], { headers: { 'Content-Type': 'text/plain', 'X-Path': path }});
		} catch(err) {
			console.error(err);
			return Response.json(err, { status: 500 });
		}
	}
});
