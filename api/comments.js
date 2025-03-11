import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, getCollectionItems, deleteCollectionItem, getPublicKey } from './utils.js';

const hash = async (str, {
	algo = 'SHA-256',
	// alphabet = 'base64',
} = {}) => {
	const encoded = new TextEncoder().encode(str.trim());
	const hashed = await crypto.subtle.digest(algo, encoded);
	return new Uint8Array(hashed).toHex();
};

const COLLECTION = 'comments';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (searchParams.has('post')) {
			const comments = await getCollectionItems(COLLECTION, {
				limit: 20,
				page: searchParams.has('page') ? Math.max(parseInt(searchParams.get('page')), 1) : 1,
				filters: [
					['post', '=', searchParams.get('post')],
				]
			});

			return Response.json(comments);
		} else {
			throw new HTTPBadRequestError('Missing required post id.');
		}
	},

	async post(req) {
		// Currently no authorization is required to post a comment
		const data = await req.formData();
		const missing = ['name', 'email', 'comment', 'post'].filter(field => ! data.has(field));

		if (missing.length !== 0) {
			throw new HTTPBadRequestError(`Missing required field(s): ${missing.join(', ')}`);
		} else {
			const result = await addCollectionItem(COLLECTION, {
				uuid: crypto.randomUUID(),
				name: data.get('name').trim(),
				email: await hash(data.get('email').toLowerCase()),
				post: data.get('post'),
				comment: data.get('comment').trim(),
				created: new Date(),
				updated: new Date(),
			});

			return Response.json({ id: result.id });
		}
	},

	async delete(req) {
		const { searchParams } = new URL(req.url);

		if (! searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required comment id.');
		} else if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token for request.');
		} else {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['comments:delete'],
				roles: ['admin'],
				scope: 'api',
				claims: ['exp', 'sub', 'sub_id', 'email', 'name', 'picture'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You are not authorized to delete comments.', { cause: result });
			} else {
				await deleteCollectionItem(COLLECTION, searchParams.get('id'));

				return new Response(null, { status: 204 });
			}
		}
	}
});
