import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { createHandler, HTTPNotFoundError, HTTPForbiddenError, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { getCollectionItem, deleteCollectionItem, getPublicKey, getCollectionItems, getFirestore, sluggify } from './utils.js';

const JWT = 'org-jwt';
const COLLECTION = 'posts';
const LIMIT = 20;

export default createHandler({
	async get(req) {
		const url = new URL(req.url);
		const params = url.searchParams;

		if (params.has('id')) {
			const post = await getCollectionItem(COLLECTION, params.get('id'));

			if (post === null) {
				throw new HTTPNotFoundError(`Could not find post ${params.get('id')}.`);
			} else {
				return Response.json(post);
			}
		} else if (params.has('from') && params.has('to')) {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['createdAt', '>=', new Date(`${params.get('from')}T00:00:59.999`)],
					['createdAt', '<=', new Date(`${params.get('to')}T23:59:59.999`)]
				]
			});

			return Response.json(posts);
		} else if (params.has('date')) {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['createdAt', '>=', new Date(`${params.get('date')}T00:00:59.999`)],
					['createdAt', '<=', new Date(`${params.get('date')}T23:59:59.999`)],
				]
			});

			return Response.json(posts);
		} else {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.min(parseInt(params.get('page')), 1) : 1,
			});

			return Response.json(posts);
		}
	},

	async post(req) {
		if (req.cookies.has(JWT)) {
			const result = await verifyJWT(req.cookies.get(JWT), await getPublicKey(), {
				entitlements: ['post:create'],
				roles: ['admin'],
				scope: 'api',
				claims: ['exp', 'sub', 'sub_id', 'email', 'name', 'picture'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to create posts or your token is expired.', { cause: result });
			} else {
				const data = await req.formData();

				if (! (data.has('content') && data.has('title') && data.has('description'))) {
					throw new HTTPBadRequestError('Missing required content or title fields.');
				} else {
					const { sub, sub_id, name, email, picture } = result;

					const db = await getFirestore();
					const date = new Date();
					const path = '/posts/' + [
						[
							date.getFullYear(),
							(date.getMonth() + 1).toString().padStart(2, '0'),
							date.getDate().toString().padStart(2, '0')
						].join('-'),
						sluggify(data.get('title')),
					].join(':');

					const docRef = db.doc(path);

					await docRef.set({
						author: { sub, sub_id, name, email, picture },
						title: data.get('title'),
						content: data.get('content'),
						createdAt: date,
					});

					return new Response(null, {
						status: 201,
						headers: { Location: path },
					});
				}
			}
		} else {
			throw new HTTPForbiddenError('Missing required token.');
		}
	},

	async delete(req) {
		const url = new URL(req.url);
		const params = url.searchParams;
		const postId = params.get('id');

		if (req.cookies.has(JWT)) {
			const result = await verifyJWT(req.cookies.get(JWT), await getPublicKey(), {
				entitlements: ['post:delete'],
				roles: ['admin'],
				scope: 'api',
				claims: ['exp', 'sub', 'sub_id'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to delete posts or your token is expired.', { cause: result });
			} else {
				await deleteCollectionItem('posts', postId);
				return new Response(null, { status: 204 });
			}
		} else {
			throw new HTTPForbiddenError('Missing required token.');
		}
	},
}, {
	logger: err => console.error(err),
});
