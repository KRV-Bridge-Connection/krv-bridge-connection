import { createHandler, HTTPNotFoundError, Cookie } from '@shgysk8zer0/lambda-http';
import { getCollectionItems, getCollectionItem, getCollectionItemsWhere } from './utils.js';

const STORE = 'partners';
const COOKIE_NAME = '_lastSync_partners';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function transformPartner({ lastUpdated, keywords, hoursAvailable = {}, ...data }) {
	return {
		...data,
		lastUpdated: new Date(lastUpdated._seconds * 1000).toISOString(),
		keywords: Array.isArray(keywords) ? keywords.map(keyword => keyword.toLowerCase()) : [],
		hoursAvailable: Array.isArray(hoursAvailable)
			? hoursAvailable.sort((day1, day2) => DAYS.indexOf(day1.dayOfWeek) - DAYS.indexOf(day2.dayOfWeek))
			: []
	};
}

const getCookie = () => new Cookie({
	name: COOKIE_NAME,
	value: Date.now(),
	// path: '/', // Seems to be a bug setting a path of "/", so adding it manually
	httpOnly: false,
	sameSite: 'strict',
	secure: true,
	expires: new Date(Date.now() + 15724800000), // + 182 days
	partitioned: true,
}) + '; Path=/;';

export default createHandler({
	async get(req) {
		const headers = new Headers({ 'Cache-Control': 'private, max-age=86400' });
		const params = new URL(req.url).searchParams;

		if (params.has('id')) {
			const result = await getCollectionItem(STORE, params.get('id'));

			if (typeof result?.id === 'string') {
				return Response.json(transformPartner(result));
			} else {
				throw new HTTPNotFoundError(`No results for ${params.get('id')}.`);
			}
		} else if (params.has('category')) {
			const results = await getCollectionItemsWhere(STORE, 'keywords', 'array-contains', params.get('category').toLowerCase());
			return Response.json(results.map(transformPartner), { status: results.length === 0 ? 404 : 200 }, { headers });
		} else if (req.cookies.has(COOKIE_NAME)) {
			const lastUpdated = new Date((parseInt(req.cookies.get(COOKIE_NAME)) || 0));
			const results = await getCollectionItemsWhere(STORE, 'lastUpdated', '>', lastUpdated);
			headers.set('Set-Cookie', getCookie());
			return Response.json(results.map(transformPartner), { headers });
		} else {
			const partners = await getCollectionItems(STORE, { limit: NaN });
			headers.set('Set-Cookie', getCookie());
			return Response.json(partners.map(transformPartner), { headers });
		}
	},
});
