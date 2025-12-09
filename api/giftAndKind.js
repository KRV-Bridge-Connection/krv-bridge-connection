import { createHandler } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, getCollectionItems } from './utils.js';

const COLLECTION = 'gift_and_kind';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (! (searchParams.has('name') && searchParams.has('id'))) {
			const start = new Date(searchParams.get('date'));
			start.setDate(1);
			start.setHours(0);
			start.setMinutes(0);
			start.setSeconds(0);
			const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59);
			const results = await getCollectionItems(COLLECTION, {
				limit: NaN,
				filters: [
					['date', '>', start],
					['date', '<', end],
				],
			});

			const count = Object.groupBy(results, item => item.id);

			return Response.json({
				start: start.toLocaleString(),
				end: end.toLocaleString(),
				count: Object.fromEntries(Object.values(count).map((arr) => [arr[0].name, arr.length])),
			});
		} else {
			await addCollectionItem(COLLECTION, {
				name: searchParams.get('name'),
				id: searchParams.get('id'),
				date: new Date(),
			});

			return new Response(null, { status: 201 });
		}
	}
});
