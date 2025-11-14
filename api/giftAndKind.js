import { createHandler, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem } from './utils.js';

const COLLECTION = 'gift_and_kind';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (! (searchParams.has('name') && searchParams.has('id'))) {
			throw new HTTPBadRequestError('Missing required name or id.');
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
