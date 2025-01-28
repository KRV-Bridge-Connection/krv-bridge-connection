import { createHandler, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { getCollectionItems, getCollectionItem, getCollectionItemsWhere } from './utils.js';

const STORE = 'partners';

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;

		if (params.has('id')) {
			const result = await getCollectionItem(STORE, params.get('id'));
			if (typeof result?.id === 'string') {
				return Response.json(result);
			} else {
				throw new HTTPNotFoundError(`No results for ${params.get('id')}.`);
			}
		} if (params.has('category')) {
			const results = await getCollectionItemsWhere(STORE, 'categories', 'array-contains', params.get('category'));
			return Response.json(results, { status: results.length === 0 ? 404 : 200 });
		} else {
			const partners = await getCollectionItems(STORE);
			return Response.json(partners);
		}
	},
});
