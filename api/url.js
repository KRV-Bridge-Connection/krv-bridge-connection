import {
	createHandler,
	HTTPNotFoundError,
	HTTPForbiddenError,
	HTTPUnauthorizedError,
	HTTPBadRequestError,
} from '@shgysk8zer0/lambda-http';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { checkGeohash } from '@shgysk8zer0/geoutils';
import { getPublicKey, getCollectionItem, addCollectionItem, deleteCollectionItem } from './_shared/utils.js';
import { captureException, flush } from './_shared/sentry.js';

const collection = 'links';

export default createHandler({
	async get(req) {
		if (! req.searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else {
			const result = await getCollectionItem('links', req.searchParams.get('id'));

			if (URL.canParse(result?.url)) {
				return Response.redirect(result.url);
			} else {
				throw new HTTPNotFoundError(`No link for ${req.searchParams.get('id')} found.`);
			}
		}
	},
	async post(req, { ip, geo }) {
		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('This request requires a token for authorization.');
		} else {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['link:create'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid/expired token or missing required permissions.', { cause: result });
			} else {
				const data = await req.formData();

				if (! URL.canParse(data.get('url'))) {
					throw new HTTPBadRequestError('Invalid or missing URL.');
				} else {
					const docRef = await addCollectionItem(collection, {
						url: data.get('url'),
						createdAt: new Date(),
						updatedAt: new Date(),
						user: result.sub,
						org: result.sub_id,
					});

					const url = new URL(req.pathname, req.origin);
					url.searchParams.set('id', docRef.id);

					return new Response(null, {
						headers: { Location: url.href },
						status: 201, // Created
					});
				}
			}
		}
	},
	async delete(req, { ip, geo }) {
		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('This request requires a token for authorization.');
		} else if (! req.searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id');
		} else {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['link:delete'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid/expired token or missing required permissions.', { cause: result });
			} else {
				if (await deleteCollectionItem(collection, req.searchParams.get('id'))) {
					return new Response(null, { status: 204 /* No Content */ });
				} else {
					throw new HTTPNotFoundError(`No entry for URL with ID ${req.searchParams.get('id')}.`);
				}
			}
		}
	}
}, {
	exposeHeaders: ['Location'],
	allowCredentials: true,
	logger: err => captureException(err),
	waitUntil: () => flush(2000),
});
