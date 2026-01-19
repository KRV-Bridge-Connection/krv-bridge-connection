import { createHandler, HTTPBadRequestError, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { getCollectionItem, getCollectionItems, getCollectionItemsWhere, getDocumentRef, putCollectionItem } from './utils.js';

const INVENTORY = 'pantry_inventory';
const TRANSACTIONS = 'pantry_checkout';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (searchParams.has('id')) {
			const barcode = searchParams.get('id');

			if (! /^[0-9]{8,15}$/.test(barcode)) {
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
		const name = cart.getAll('item[name]');
		const qty = cart.getAll('item[qty]');

		if (id.length === 0) {
			throw new HTTPBadRequestError('Invalid empty request.');
		} else if (! (id.length === name.length && id.length === qty.length)) {
			throw new Error('Mistmatch of size of item id/name/qty.');
		} else {
			const apptId = cart.get('appt');
			const items = id.map((id, i) => ({ id, name: name[i], qty: parseInt(qty[i]) }));
			const appt = typeof apptId === 'string' && apptId.length !== 0 ? await getDocumentRef('pantry_schedule', apptId.trim()) : null;
			const succeeded = await putCollectionItem(TRANSACTIONS, orderId, {
				orderId,
				created,
				items,
				appt,
				name: cart.get('name')?.trim?.() ?? '',
				givenName: cart.get('givenName')?.trim?.() ?? '',
				familyName: cart.get('familyName')?.trim?.() ?? '',
			}).then(() => true).catch(() => false);

			console.log(succeeded);

			const url = new URL('https://krvbridge.org/api/pantry');
			url.searchParams.set('order', orderId);

			return new Response(null, {
				status: succeeded ? 201 : 502,
				headers: { location: url.href },
			});
		}
	}
}, { logger: console.error });
