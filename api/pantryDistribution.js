import { createHandler, HTTPBadRequestError, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, getCollectionItem, getCollectionItems, getCollectionItemsWhere } from './utils.js';

const INVENTORY = 'pantry_inventory';
const TRANSACTIONS = 'pantry_checkout';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (searchParams.has('id')) {
			const barcode = searchParams.get('id');

			if (! /^[0-9]{12,15}$/.test(barcode)) {
				throw new HTTPBadRequestError(`Invalid barcode: ${barcode}.`);
			} else {
				const item = await getCollectionItem(INVENTORY, barcode);

				if (item?.id === barcode) {
					return Response.json(item);
				} else {
					throw new HTTPNotFoundError(`Not product with id ${barcode} found.`);
				}
			}
		} else if (searchParams.has('lastUpdated')) {
			const lastUpdated = new Date(parseInt(searchParams.get('lastUpdated')));
			const results = await getCollectionItemsWhere(INVENTORY, 'updated', '>', lastUpdated);

			return Response.json(results);
		} else {
			const inventory = await getCollectionItems(INVENTORY, { limit: 50 });

			return Response.json(inventory);
		}
	},
	async post(req) {
		const cart = await req.formData();
		const orderId = crypto.randomUUID();
		const created = new Date();
		const id = cart.getAll('item[id]');

		if (id.length === 0) {
			throw new HTTPBadRequestError('Invalid empty request.');
		} else {
			const name = cart.getAll('item[name]');
			const qty = cart.getAll('item[qty]');
			const items = id.map((id, i) => ({ id, name: name[i], qty: parseInt(qty[i]) }));
			const result = await addCollectionItem(TRANSACTIONS, {
				orderId,
				created,
				items,
				appt: cart.get('appt'),
				givenName: cart.get('givenName'),
				familyName: cart.get('familyName'),
			});

			return new Response(null, {
				status: 201,
				headers: { location: `${req.url}?id=${result.id}` },
			});
		}
	}
});
