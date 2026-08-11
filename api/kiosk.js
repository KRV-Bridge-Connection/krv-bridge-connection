import { createHandler } from '@shgysk8zer0/lambda-http';
import { putCollectionItem, getCollectionItems } from './utils.js';

export default createHandler({
	async get() {
		const items = await getCollectionItems('kiosk', {
			lomit: 1000,
			filters: [
				['timestamp', '>', new Date('2026-08-01T00:00')],
				['timestamp', '<', new Date('2026-09-01T00:00')]
			]
		});

		return Response.json(items.map(item => ({
			name: item.name,
			timestamp: new Date(item.timestamp._seconds * 1000).toLocaleString(),
			size: item.size,
			partners: item.partners,
			services: item.services,
		})));
	},
	async post(req) {
		const data = await req.formData();

		await putCollectionItem('kiosk', data.get('uuid'), {
			uuid: data.get('uuid'),
			name: data.get('contact[name]'),
			size: parseInt(data.get('size'), 10),
			phone: data.get('contact[phone]'),
			email: data.get('contact[email]'),
			message: data.get('message'),
			partners: data.getAll('partners[]'),
			services: data.getAll('services[]'),
			age: parseInt(data.get('contact[age]'), 10),
			timestamp: new Date(),
		});

		return new Response(null, { status: 204 });
	}
});
