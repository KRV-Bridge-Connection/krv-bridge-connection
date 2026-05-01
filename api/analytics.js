import { createHandler, HTTPBadRequestError, HTTPUnauthorizedError, HTTPForbiddenError } from '@shgysk8zer0/lambda-http';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { putCollectionItem, getFirestore, getPublicKey } from './utils.js';

const STORE_NAME = 'analytics';

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;

		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required JWT');
		} else if (! (params.has('from') && params.has('to'))) {
			throw new HTTPBadRequestError('Missing required start and end dates.');
		} else {
			const key = await getPublicKey();
			const result = await verifyJWT(req.cookies.get('org-jwt'), key, {
				entitlements: ['analytics:view'],
				roles: ['admin'],
				scope: 'api',
				claims: ['exp', 'sub', 'sub_id', 'email', 'name', 'picture'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You are not authorized to view analytics.', { cause: result });
			} else {
				const url = new URL(req.url);
				const startDate = new Date(params.get('from'));
				const endDate = new Date(params.get('to'));
				const db = await getFirestore();
				const query = db.collection(STORE_NAME)
					.where('type', '==', params.get('type') ?? 'load')
					.where('origin', '==', url.origin)
					.where('timestamp', '>=', startDate)
					.where('timestamp', '<=', endDate);

				const aggregateQuery = query.count();
				const snapshot = await aggregateQuery.get();

				return Response.json({
					count: snapshot.data().count,
					at: Date.now(),
					from: startDate.toISOString(),
					to: startDate.toISOString(),
				});
			}
		}
	},
	async post(req) {
		const data = await req.formData();

		if (['id', 'type', 'timestamp', 'url', 'origin'].every(field => data.has(field))) {
			await putCollectionItem(STORE_NAME, data.get('id'), {
				id: data.get('id'),
				type: data.get('type'),
				timestamp: new Date(parseInt(data.get('timestamp'))),
				origin: data.get('origin'),
				url: data.get('url'),
			});
			// console.log(Object.fromEntries(req.headers));
			return new Response(null, { status: 202 });
		} else {
			throw new HTTPBadRequestError('Request has missing required fields.');
		}
	}
}, {
	logger: console.error
});
