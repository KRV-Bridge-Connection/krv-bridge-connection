import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPNotFoundError, HTTPNotImplementedError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { deleteCollectionItem, getCollectionItem, getCollectionItems, getPublicKey } from './utils.js';
import { decrypt, getSecretKey } from '@shgysk8zer0/aes-gcm';
import { NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';

const COLLECTION = 'pantry-schedule';

const MONTHLY_VISITS = 2;

const getMonthStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0, 0);

const REPLACEMENTS = {
	'CH': 'K',
	'CK': 'K',
	'C': 'K',
	'PH': 'F',
};

const PHONETIC_PATTERN = new RegExp(Object.keys(REPLACEMENTS).join('|'), 'g');

const getFirebaseDate = date => new Date(date._seconds * 1000);

// Simple attempt at dealing with name spelling variations
const normalizeName = name => name.toString()
	.trim()
	.toUpperCase()
	.normalize('NFD')
	.replaceAll(/\p{Diacritic}/gu, '')
	.replaceAll(/[AEIOU]/g, '')
	.replaceAll(/([A-Z])\1+/g, '$1')
	.replaceAll(PHONETIC_PATTERN, chars => REPLACEMENTS[chars] || chars);

function getLastMonth(date = new Date()) {
	// Avoid using date getter twice
	const d = date.getDate();
	const prior = new Date(date.getFullYear(), date.getMonth() - 1, d, 0, 0, 0, 0);

	if (prior.getDate() !== d) {
		prior.setDate(0);
	}

	return prior;
}

async function getRecentVisits(name, date = new Date(), { countExtra = false } = {}) {
	const prior = getLastMonth(date);

	const filters = countExtra ? [
		['date', '>', prior],
		['date', '<', getMonthStart(date)],
		['_name', '==', normalizeName(name)],
	] : [
		['date', '>', prior],
		['date', '<', getMonthStart(date)],
		['_name', '==', normalizeName(name)],
		['extra_trip', '==', false]
	];

	return getCollectionItems(COLLECTION, { filters });
}

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);
		const token = req.cookies.get('org-jwt');

		if (searchParams.has('name')) {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const visits = await getRecentVisits(searchParams.get('name'), new Date(), { countExtra: true });
				const count = visits.length;
				const nextVisit = count >= MONTHLY_VISITS
					? getFirebaseDate(visits[MONTHLY_VISITS - 1].date)
					: new Date();

				if (count > MONTHLY_VISITS) {
					nextVisit.setMonth(nextVisit.getMonth() + 1);
				}

				return Response.json({
					name: searchParams.get('name'),
					visits: visits.map(({ date }) => getFirebaseDate(date)),
					count,
					allowed: count < MONTHLY_VISITS,
					nextVisit: nextVisit.toISOString(),
					since: new Date().toISOString(),
				});
			}
		} else if (searchParams.has('date')) {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const start = new Date(searchParams.get('date'));
				const end = new Date(searchParams.get('date'));
				end.setHours(17);
				end.setMinutes(0);
				const appts = await getCollectionItems(COLLECTION, {
					limit: NaN,
					filters: [
						['date', '>', start],
						['date', '<', end],
					]
				});

				return Response.json(appts.map(({ name, date, created, points, household }) => ({
					name,
					points,
					household,
					date: new Date(date._seconds * 1000).toISOString(),
					created: new Date(created._seconds * 1000),
				})));
			}
		} else if (! searchParams.has('id')) {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const appts = await getCollectionItems(COLLECTION, {
					limit: 20,
					filters: [
						['date', '>', new Date()]
					]
				});

				return Response.json(appts.map(({ name, date, created, points, household }) => ({
					name,
					points,
					household,
					date: new Date(date._seconds * 1000).toISOString(),
					created: new Date(created._seconds * 1000),
				})));
			}
		} else  {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const appt = await getCollectionItem(COLLECTION, searchParams.get('id'));

				if (typeof appt !== 'object' || typeof appt.date === 'undefined') {
					throw new HTTPNotFoundError(`No results for id ${searchParams.get('id')}.`);
				} else if (appt instanceof Error) {
					throw appt;
				} else {
					const key = await getSecretKey();

					return Response.json({
						name: appt.name,
						points: appt.points,
						household: appt.household,
						streetAddress: typeof appt.streetAddress === 'string' ? await decrypt(key, appt.streetAddress, { input: 'base64', output: 'text' }) : null,
						addressLocality: appt.addressLocality,
						date: new Date(appt.date._seconds * 1000).toISOString(),
						telephone: typeof appt.telephone === 'string' ? await decrypt(key, appt.telephone, { input: 'base64', output: 'text' }) : null,
						email: typeof appt.email === 'string' ? await decrypt(key, appt.email, { input: 'base64', output: 'text' }) : null,
						comments: typeof appt.comments === 'string' ? await decrypt(key, appt.comments, { input: 'base64', output: 'text' }) : null,
					});
				}
			}
		}
	},
	async post() {
		throw new HTTPNotImplementedError('Online pantry registration has been disabled.');
	},

	async delete(req) {
		const { searchParams } = new URL(req.url);
		const token = req.cookies.get('org-jwt');

		if (! searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required token for request.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:delete'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const deleted = await deleteCollectionItem(COLLECTION, searchParams.get('id'));

				if (deleted) {
					return new Response(null, { status: NO_CONTENT });
				} else {
					throw new HTTPNotFoundError(`Nothing scheduled with id ${searchParams.get('id')}.`);
				}
			}
		}
	}
});
