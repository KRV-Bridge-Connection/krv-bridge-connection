import { createHandler, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { getCollectionItems, getCollectionItem, getCollectionItemsWhere } from './utils.js';

const STORE = 'partners';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function transformPartner({ lastUpdated, categories, hoursAvailable = {}, ...data }) {
	return {
		...data,
		lastUpdated: new Date(lastUpdated._seconds * 1000).toISOString(),
		categories: Array.isArray(categories) ? categories.map(category => category.toLowerCase()) : [],
		hoursAvailable: Array.isArray(hoursAvailable)
			? hoursAvailable.sort((day1, day2) => DAYS.indexOf(day1.dayOfWeek) - DAYS.indexOf(day2.dayOfWeek))
			: []
	};
}

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;

		if (params.has('id')) {
			const result = await getCollectionItem(STORE, params.get('id'));

			if (typeof result?.id === 'string') {
				return Response.json(transformPartner(result));
			} else {
				throw new HTTPNotFoundError(`No results for ${params.get('id')}.`);
			}
		} else if (params.has('category')) {
			const results = await getCollectionItemsWhere(STORE, 'categories', 'array-contains', params.get('category'));
			return Response.json(results.map(transformPartner), { status: results.length === 0 ? 404 : 200 });
		} else if (params.has('lastUpdated')) {
			const lastUpdated = new Date(params.get('lastUpdated'));
			const results = await getCollectionItemsWhere(STORE, 'lastUpdated', '>', lastUpdated);
			return Response.json(results.map(transformPartner));
		} else {
			const partners = await getCollectionItems(STORE, { limit: 100 });
			return Response.json(partners.map(transformPartner));
		}
	},
});
