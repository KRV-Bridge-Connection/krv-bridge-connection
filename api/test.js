import { createHandler } from '@shgysk8zer0/netlify-func-utils';

async function getBody(req) {
	if (req.headers.has('Content-Type')) {
		switch (req.headers.get('Content-Type').split(';')[0]) {
			case 'application/json':
				return await req.json();

			case 'multipart/formd-data':
			case 'application/x-www-form-urlencoded':
				return Object.fromEntries(await req.formData());

			case 'text/plain':
				return await req.text();

			default:
				return new Blob(await req.arrayBuffer(), { type: req.headers.get('Content-Type') });
		}
	} else {
		return null;
	}
}

async function createResponse(req) {
	return Response.json({
		headers: Object.fromEntries(req.headers),
		url: req.url,
		mode: req.mode,
		method: req.method,
		body: await getBody(req),
	});
}

export const handler = createHandler({
	async get(req) {
		return createResponse(req);
	},

	async post(req) {
		return createResponse(req);
	},

	async put(req) {
		return createResponse(req);
	},

	async delete(req) {
		return createResponse(req);
	}
});
