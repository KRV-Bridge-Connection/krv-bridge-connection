import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';

Blob.prototype.toJSON = function() {
	return {
		name: this.name,
		size: this.size,
		type: this.type,
	};
};

function getBody(req) {
	switch(req.headers.get('Content-Type').split(';')[0].toLowerCase()) {
		case 'application/json':
			return req.json();

		case 'application/x-www-form-urlencoded':
		case 'multipart/form-data':
			return req.formData().then(data => Object.fromEntries(data));

		default: return req.text();
	}
}

export const handler = createHandler({
	async get(req) {
		return Response.json({
			url: req.url,
			headers: Object.fromEntries(req.headers),
			method: req.method,
		});
	},
	async delete(req) {
		console.log(req);
		return Response.json({
			url: req.url,
			headers: Object.fromEntries(req.headers),
			method: req.method,
		});
	},
	async post(req) {
		return Response.json({
			url: req.url,
			headers: Object.fromEntries(req.headers),
			method: req.method,
			body: await getBody(req),
			cookies: Object.fromEntries(req.cookies),
		});
	}
});
