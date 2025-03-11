import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, deleteCollectionItem, getCollectionItemsWhere, getPublicKey } from './utils.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { CREATED, NO_CONTENT } from '@shgysk8zer0/consts/status.js';

const REQUIRED_FIELDS = [
	'name', 'startDate', 'description', 'location[name]', 'location[address][addressLocality]',
	'location[address][postalCode]', 'organizer[name]',
];

const _transform = ({ '@type': type= 'Event', startDate, endDate, ...data }) => ({
	'@context': 'https://schema.org',
	'@type': type,
	startDate: new Date(startDate._seconds * 1000).toISOString(),
	endDate: new Date(endDate._seconds * 1000).toISOString(),
	...data,
});

const COLLECTION = 'events';

export default createHandler({
	async get() {
		const events = await getCollectionItemsWhere(COLLECTION, 'startDate', '>', new Date());

		return Response.json(events.map(_transform), {
			headers: { 'Content-Type': 'application/ld+json' },
		});
	},

	async post(req) {
		const token = req.cookies.get('org-jwt');

		if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required credentials/token.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['events:create'],
				roles: ['admin'],
			});

			const data = await req.formData();
			const missing = REQUIRED_FIELDS.filter(field => ! data.has(field));

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Error validating token', { cause: result });
			} else if (missing.length !== 0) {
				throw new HTTPBadRequestError(`Missing required event fields: ${missing.join(', ')}`);
			} else {
				const result = await addCollectionItem(COLLECTION, {
					'@type': data.get('@type') || 'Event',
					name: data.get('name'),
					startDate: new Date(data.get('startDate')),
					endDate: new Date(data.get('endDate')),
					description: data.get('description'),
					url: data.get('url'),
					location: {
						'@type': data.get('location[@type]') || 'Place',
						name: data.get('location[name]'),
						address: {
							'@type': 'PostalAddress',
							streetAddress: data.get('location[address][streetAddress]'),
							addressLocality: data.get('location[address][addressLocality]'),
							addressRegion: data.get('location[address][addressRegion]') || 'CA',
							postalCode: data.get('location[address][postalCode]') || null,
							addressCountry: data.get('location[address][addressCountry]') || 'US',
						},
						geo: {
							'@type': 'GeoCoordinates',
							latitude: parseFloat(data.get('location[geo][latitude]')),
							longitude: parseFloat(data.get('location[geo][longitude]')),
						},
					},
					organizer: {
						'@type': data.get('organizer[@type]'),
						name: data.get('organizer[name]'),
						email: data.get('organizer[email]'),
						telephone: data.get('organizer[telephone]'),
					},
				});

				return new Response(null, {
					status: CREATED,
					headers: {
						location: `/api/events/?id=${result.id}`,
					}
				});
			}
		}
	},

	async delete(req) {
		const token = req.cookies.get('org-jwt');
		const { searchParams } = new URL(req.url);

		if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required credentials/token.');
		} else if (! searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['events:create'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Error validating token', { cause: result });
			} else {
				await deleteCollectionItem(COLLECTION, searchParams.get('id'));
				return new Response(null, { status: NO_CONTENT });
			}
		}
	}
});
