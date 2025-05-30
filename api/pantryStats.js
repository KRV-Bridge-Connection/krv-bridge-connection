import { createHandler } from '@shgysk8zer0/lambda-http';
import { getCollectionItems } from './utils.js';

const COLLECTION = 'pantry-schedule';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default createHandler({
	async get(req) {
		const params = new URL(req.url).searchParams;
		const date = params.has('date') ? new Date(params.get('date')) : new Date();
		let people = 0;
		let visits = 0;
		let unique = 0;
		const times = {};
		const days = {};
		const uniqueIds = new Set();
		const results = await getCollectionItems(COLLECTION, {
			limit: NaN,
			filters: [
				['date', '>', new Date(date.getFullYear(), date.getMonth(), 1)],
				['date', '<', new Date(date.getFullYear(), date.getMonth() + 1, 1)],
			]
		});

		results.forEach(({ household = 0, date, _name }) => {
			people += household;
			visits++;
			const d = new Date(date._seconds * 1000);
			const hour = d.getHours().toString();
			const day = DAYS[d.getDay()];
			times[hour] = (times[hour] ?? 0) + 1;
			days[day] = (days[day] ?? 0) + 1;

			if (! uniqueIds.has(_name)) {
				unique += household;
				uniqueIds.add(_name);
			}
		});

		return Response.json({ individuals: people, visits, unique, days, times });
	}
});
