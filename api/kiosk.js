import { createHandler } from '@shgysk8zer0/lambda-http';
import { putCollectionItem } from './utils.js';

export default createHandler({
	async post(req) {
		const data = await req.formData();
		console.log(data);

		await putCollectionItem('kiosk', data.get('uuid'), {
			partners: data.getAll('partner'),
			uuid: data.get('uuid'),
			name: data.get('contact[name]'),
			phone: data.get('contact[phone]'),
			email: data.get('contact[email]'),
			timestamp: new Date(),
		});

		return new Response(null, { status: 204 });
	}
});
