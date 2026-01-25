import { createHandler, HTTPBadRequestError, HTTPNotFoundError, HTTPNotImplementedError } from '@shgysk8zer0/lambda-http';
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
	async post() {
		throw new HTTPNotImplementedError('Pantry distribution submission has been disabled.');
	}
});
