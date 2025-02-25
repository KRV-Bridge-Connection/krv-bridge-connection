import { createHandler, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, getCollectionItems } from './utils.js';

export default createHandler({
	async get() {
		const inventory = await getCollectionItems('pantry_inventory', { limit: 50 });

		return Response.json(inventory);
	},
	async post(req) {
		const cart = await req.formData();
		const orderId = crypto.randomUUID();
		const created = new Date();
		const id = cart.getAll('item[id]');

		if (id.length === 0) {
			throw new HTTPBadRequestError(`Invalid empty request.`);
		} else {
			const name = cart.getAll('item[name]');
			const qty = cart.getAll('item[qty]');
			const items = id.map((id, i) => ({ id, name: name[i], qty: parseInt(qty[i]) }));
			const result = await addCollectionItem('pantry_checkout', { orderId, created, items });

			return new Response(null, {
				status: 201,
				headers: { location: `${req.url}?id=${result.id}` },
			});
		}
	}
});
