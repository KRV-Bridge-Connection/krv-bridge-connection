import { createHandler } from '@shgysk8zer0/lambda-http';
import { putCollectionItem } from './utils.js';

const COLLECTION = 'pantry_inventory';

export default createHandler({
	async post(req) {
		const data = await req.formData();

		await putCollectionItem(COLLECTION, data.get('barcode').trim(), {
			id: data.get('barcode').trim(),
			name: data.get('name').trim(),
			cost: parseFloat(data.get('cost').trim()),
			updated: new Date(),
		});

		return new Response(null, { status: 201 });
	}
});
