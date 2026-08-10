import { createHandler } from '@shgysk8zer0/lambda-http';
import { putCollectionItem } from './utils.js';

export default createHandler({
	async post(req) {
		const data = await req.formData();

		await putCollectionItem('kiosk', data.get('uuid'), {
			uuid: data.get('uuid'),
			name: data.get('contact[name]'),
			phone: data.get('contact[phone]'),
			services: data.getAll('services[]'),
			email: data.get('contact[email]'),
			age: parseInt(data.get('contact[age]'), 10),
			timestamp: new Date(),
		});

		return new Response(null, { status: 204 });
	}
});
