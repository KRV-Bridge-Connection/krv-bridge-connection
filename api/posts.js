import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { createHandler, HTTPNotFoundError, HTTPForbiddenError, HTTPBadRequestError, HTTPBadGatewayError } from '@shgysk8zer0/lambda-http';
import { getCollectionItem, deleteCollectionItem, getPublicKey, getCollectionItems, getFirestore, sluggify, uploadImage } from './utils.js';

const JWT = 'org-jwt';
const COLLECTION = 'posts';
const LIMIT = 20;

const _getDateSlug = (date = new Date(), separater = '-') => [
	date.getFullYear(),
	(date.getMonth() + 1).toString().padStart(2, '0'),
	date.getDate().toString().padStart(2, '0')
].join(separater);

function _convertPost(data) {
	data.created = new Date(data.created._seconds * 1000).toISOString();
	data.updated = new Date(data.updated._seconds * 1000).toISOString();

	if (typeof data.image !== 'object') {
		data.image = {
			src: 'https://cdn.kernvalley.us/img/raster/missing-image.png',
			width: 640,
			height: 480,
			alt: '',
		};
	}
	return data;
}

export default createHandler({
	async get(req) {
		const url = new URL(req.url);
		const params = url.searchParams;

		if (params.has('id')) {
			const post = await getCollectionItem(COLLECTION, params.get('id'));

			if (post === null) {
				throw new HTTPNotFoundError(`Could not find post ${params.get('id')}.`);
			} else {
				return Response.json(_convertPost(post));
			}
		} else if (params.has('from') && params.has('to')) {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['created', '>=', new Date(`${params.get('from')}T00:00:59.999`)],
					['created', '<=', new Date(`${params.get('to')}T23:59:59.999`)],
					['status' , '=', 'published'],
				],
			});

			return Response.json(posts.map(_convertPost));
		} else if (params.has('date')) {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['created', '>=', new Date(`${params.get('date')}T00:00:59.999`)],
					['created', '<=', new Date(`${params.get('date')}T23:59:59.999`)],
					['status' , '=', 'published'],
				],
			});

			return Response.json(posts.map(_convertPost));
		} else if (params.has('keyword')) {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['keywords', 'array-contains', params.get('keyword')],
					['status', '=', 'published'],
				],
			});

			return Response.json(posts.map(_convertPost));
		} else {
			const posts = await getCollectionItems(COLLECTION, {
				limit: LIMIT,
				page: params.has('page') ? Math.max(parseInt(params.get('page')), 1) : 1,
				filters: [
					['status', '=', 'published'],
				],
			});

			return Response.json(posts.map(_convertPost));
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
				const missing = ['title', 'description', 'content', 'image'].filter(field => ! data.has(field));

				if (missing.length !== 0) {
					throw new HTTPBadRequestError(`Missing required field(s): ${missing.join(', ')}`);
				} else {
					const { sub, sub_id, name, email, picture } = result;
					const db = await getFirestore();
					const date = new Date();
					const path = '/posts/' + [
						_getDateSlug(date, '-'),
						sluggify(data.get('title')),
					].join(':');

					const docRef = db.doc(path);
					const content = data.get('content');
					const { link: src, width, height, id, type, size } = await uploadImage(data.get('image'), {
						clientId: process.env.IMGUR_ID,
						signal: req.signal,
					});

					const created = await docRef.set({
						author: { sub, sub_id, name, email, picture },
						title: data.get('title'),
						description: data.get('description'),
						keywords: data.getAll('keywords'),
						content: content instanceof Blob ? await content.text() : content,
						created: date,
						updated: date,
						image: { src, width, height, slug: id, type, size },
						status: data.has('status') ? data.get('status') : 'published',
					});

					if (created.writeTime !== 0) {
						return new Response(null, {
							status: 201,
							headers: { Location: path },
						});
					} else {
						throw new HTTPBadGatewayError('Error saving post.');
					}
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
				throw new HTTPForbiddenError('You do not have permission to delete posts, or your token is expired.', { cause: result });
			} else if (await deleteCollectionItem('posts', postId)) {
				return new Response(null, { status: 204 });
			} else {
				throw new HTTPNotFoundError(`There was an error deleting post with ID ${params.get('id')}. Please check that the ID is correct.`);
			}
		} else {
			throw new HTTPForbiddenError('Missing required token.');
		}
	},
}, {
	logger: err => console.error(err),
});
