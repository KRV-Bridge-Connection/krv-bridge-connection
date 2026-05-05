import { createHandler, HTTPBadRequestError, HTTPUnauthorizedError, HTTPForbiddenError } from '@shgysk8zer0/lambda-http';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { putCollectionItem, getFirestore, getPublicKey } from './utils.js';

const STORE_NAME = 'analytics';

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;

		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required JWT');
		} else if (! (params.has('from'))) {
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
				const startDate = new Date(params.get('from').trim());
				const endDate = params.has('to') ? new Date(params.get('to').trim()) : new Date();
				const db = await getFirestore();
				const query = db.collection(STORE_NAME)
					.where('type', '==', params.get('type')?.trim?.() ?? 'load')
					.where('origin', '==', url.origin)
					.where('timestamp', '>=', startDate)
					.where('timestamp', '<=', endDate);

				const aggregateQuery = query.count();
				const snapshot = await aggregateQuery.get();

				return Response.json({
					count: snapshot.data().count,
					at: Date.now(),
					type: params.has('type') ? params.get('type').trim() : 'load',
					from: startDate.toISOString(),
					to: startDate.toISOString(),
				});
			}
		}
	},
	async post(req) {
		if (! req.headers.has('Referer')) {
			throw new HTTPBadRequestError('Missing Referrer header.');
		} else {
			const data = await req.formData();
			const url = URL.parse(req.headers.get('Referer'));

			if (url instanceof URL && ['type',].every(field => data.has(field))) {
				await putCollectionItem(STORE_NAME, data.get('id'), {
					id: data.get('id') ?? crypto.randomUUID(),
					type: data.get('type').trim(),
					data:data.has('data') ?  data.get('data')?.trim() : null,
					timestamp: data.has('timestamp') ?  new Date(parseInt(data.get('timestamp').trim())) : new Date(),
					origin: url.origin,
					path: url.pathname,
					utm_source: url.searchParams.get('utm_source')?.trim?.() ?? null,
					utm_medium: url.searchParams.get('utm_medium')?.trim?.() ?? null,
					utm_campaign: url.searchParams.get('utm_campaign')?.trim?.() ?? null,
					utm_term: url.searchParams.get('utm_term')?.trim?.() ?? null,
					utm_content: url.searchParams.get('utm_content')?.trim?.() ?? null,
					referrer: data.get('referrer') || null,
				});

				return new Response(null, { status: 202 });
			} else {
				throw new HTTPBadRequestError('Invalid referrer or missing required fields.');
			}
		}
	}
}, {
	logger: console.error
});
