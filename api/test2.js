import { FORM_MULTIPART, FORM_URL_ENCODED, JSON as JSON_MIME, TEXT } from '@shgysk8zer0/consts/mimes.js';
const EMPTY_METHODS = ['GET', 'DELETE', 'HEAD', 'OPTIONS'];

Blob.prototype.toJSON = function toJSON() {
	return {
		type: this.type,
		size: this.size,
	};
};

File.prototype.toJSON = function toJSON() {
	return {
		name: this.name,
		type: this.type,
		size: this.size,
	};
};

function toJSON() {
	return Object.fromEntries(this.entries());
}

FormData.prototype.toJSON = toJSON;

Headers.prototype.toJSON = toJSON;

URLSearchParams.prototype.toJSON = toJSON;

async function getBody(req) {
	if (EMPTY_METHODS.includes(req.method)) {
		return null;
	} else if (req.headers.has('Content-Type')) {
		switch (req.headers.get('Content-Type').split(';')[0].trim().toLowerCase()) {
			case JSON_MIME:
				return await req.json();

			case FORM_MULTIPART:
			case FORM_URL_ENCODED:
				return await req.formData();

			case TEXT:
				return await req.text();

			default:
				return await req.arrayBuffer()
					.then(buff => new Blob(
						[buff],
						{ type: req.headers.get('Content-Type').split(';')[0].trim() }
					));
		}
	} else {
		return null;
	}
}

/**
 * @param  {Request} req
 * @returns {Promise<Response>}
 */
export default async (req, context) => Response.json({
	url:  req.url,
	method: req.method,
	headers: req.headers,
	destination: req.destintation,
	referrer: req.referrer,
	cache: req.cache,
	credentials: req.credentials,
	body: await getBody(req),
	context,
}, {
	headers: new Headers({
		'Access-Control-Allow-Origin': '*',
	})
});
