import { createHandler } from '@shgysk8zer0/lambda-http';
import { getCollectionItems, getCollectionItemsWhere } from './utils.js';

const STORE = 'partners';

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;

		if (params.has('category')) {
			const results = await getCollectionItemsWhere(STORE, 'categories', 'array-contains', params.get('category'));
			return Response.json(results, { status: results.length === 0 ? 404 : 200 });
		} else {
			const partners = await getCollectionItems(STORE);
			return Response.json(partners);
		}
	},
});
