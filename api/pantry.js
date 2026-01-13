import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPNotFoundError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { getPrivateKey, createJWT } from '@shgysk8zer0/jwk-utils';
import { deleteCollectionItem, getCollectionItem, getCollectionItems, getPublicKey, putCollectionItem } from './utils.js';
import { encrypt, decrypt, BASE64, getSecretKey } from '@shgysk8zer0/aes-gcm';
import { NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { openSecretStoreFile } from '@aegisjsproject/secret-store';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_PRIMARY, SlackImageBlock,
} from '@shgysk8zer0/slack';
import { createGIFBlob } from '@aegisjsproject/qr-encoder';

const QZONE = 7;

const HOUSEHOLD_MEMBER = 'person[]';

const FORMAT = {
	dateStyle: 'medium',
	timeStyle: 'short',
};

const COLLECTION = 'pantry-schedule';

const PTS = [
	30, // 1
	60, // 2
	80, // 3
	95, // 4
	110, // 5
	120, // 6
	125, // 7
	130, // 8
	135, // 9
	140, //10
];

const MAX_HOUSEHOLD = PTS.length;

const MONTHLY_VISITS = 2;

const BASE_POINTS = 5;

const getMonthStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0, 0);

function _getPoints(household) {
	return PTS[Math.min(Math.max(parseInt(household), 1), MAX_HOUSEHOLD) - 1];
}

const QRSERVER = 'https://api.qrserver.com/';

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

async function getRecentVisitCount(name, date = new Date()) {
	const visits = await getRecentVisits(name, date);

	return visits.length;
}

function getQRCodeURL(data, {
	size = 480,
	margin,
	format,
	color,
	bgColor,
	ecc,
	// ...rest
} = {}) {
	const url = new URL('/v1/create-qr-code/',  QRSERVER);
	url.searchParams.set('data', data);

	if (typeof size === 'number' && ! Number.isNaN(size)) {
		url.searchParams.set('size', `${Math.clamp(10, size, 1000)}x${Math.clamp(10, size, 1000)}`);
	}

	if (typeof margin === 'number' && ! Number.isNaN(margin)) {
		url.searchParams.set('margin', Math.clamp(0, margin, 50));
	}

	if (typeof color === 'string') {
		url.searchParams.set('color', color.replace('#', ''));
	}

	url.searchParams.set('qzone', QZONE);

	if (typeof bgColor === 'string') {
		url.searchParams.set('bgcolor', bgColor.replace('#', ''));
	}

	if (typeof format === 'string') {
		url.searchParams.set('format', format.toLowerCase());
	}

	if (typeof ecc === 'string') {
		url.searchParams.set('ecc', ecc);
	}

	return url;
}

function getID(name, date = new Date(), { alphabet = 'base64url' } = {}) {
	const ts = Uint8Array.fromHex(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime().toString(16).padStart(16, '0'));
	return `${ts.toBase64({ alphabet })}:${new TextEncoder().encode(normalizeName(name)).toBase64({ alphabet })}`;
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
	async post(req) {
		const data = await req.formData();
		const missing = [
			'givenName', 'familyName', 'addressLocality', 'postalCode', 'date', 'time'
		].filter(field => ! data.has(field));

		if (missing.length === 0) {
			const date = new Date(data.has('datetime') ? data.get('datetime') : `${data.get('date')}T${data.get('time')}`);
			const household = data.has('household')
				? Math.min(Math.max(parseInt(data.get('household')), 1), MAX_HOUSEHOLD)
				: Math.min(Math.max(data.getAll(HOUSEHOLD_MEMBER).length + 1, 1), MAX_HOUSEHOLD);

			if (Number.isNaN(date.getTime())) {
				throw new HTTPBadRequestError('Invalid date/time given.');
			} else {
				const key = await getSecretKey();
				const [store] = await openSecretStoreFile(key, '_data/secrets.json', { signal: req.signal });

				const [streetAddress, email = null, telephone = null, comments = null] = await Promise.all(
					['streetAddress', 'email', 'telephone', 'comments']
						.map(field => data.get(field) ?? null)
						.map(field => typeof field === 'string' && field.length !== 0 ? encrypt(key, field, { output: BASE64 }) : null)
				);

				const created = new Date();
				// const id = getSUID({ date: created, alphabet: 'base64url' });
				const recentVists = await getRecentVisitCount(`${data.get('givenName')} ${data.get('familyName')} ${data.get('suffix')}`, date);
				const normalTrip = recentVists < MONTHLY_VISITS;
				const points = normalTrip ? _getPoints(household) : Math.min(Math.max(household, 1), PTS.length) * BASE_POINTS;
				const name = ['givenName', 'additionalName', 'familyName', 'suffix']
					.map(field => data.has(field) ? data.get(field).trim() : null)
					.filter(field => typeof field === 'string' && field.length !== 0)
					.join(' ');

				const _name = normalizeName(name);
				const id = getID(_name, date);
				const people = data.getAll('person[]');
				const bDays = data.getAll('bDay[]');
				await putCollectionItem(COLLECTION, id, {
					id,
					givenName: data.get('givenName'),
					additionalName: data.get('additionalName')?.trim?.(),
					birthday: data.has('bDay') ? new Date(data.get('bDay') + 'T00:00') : null,
					familyName: data.get('familyName'),
					suffix: data.get('suffix')?.trim?.(),
					_name,
					name,
					email,
					telephone,
					streetAddress,
					addressLocality: data.get('addressLocality'),
					postalCode: data.get('postalCode'),
					household,
					householdMembers: people.map((name, i) => ({ name, birthday: new Date(bDays[i] + 'T00:00') })),
					comments,
					created,
					extra_trip: ! normalTrip,
					date,
					points,
				});

				const nowId = Date.now().toString(34);

				const token = await createJWT({
					iss: 'https://krvbridge.org',
					scope: 'pantry',
					entitlements: ['pantry:use'],
					roles: ['guest'],
					sub: name,
					given_name: data.get('givenName').trim(),
					middle_name: data.get('additionalName')?.trim?.(),
					family_name: data.get('familyName').trim(),
					// birthdate: data.get('bDay'),
					// phone_number: data.get('telephone'),
					// email: data.get('email'),
					iat: Math.floor(created.getTime() / 1000),
					locale: req.headers.get('Accept-Language')
						?.split(',')[0]   // Get first preference
						?.split(';')[0]   // Strip any parameters (like ;q=1.0)
						?.trim() ?? 'en-US',         // Clean up whitespace,
					nbf: Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime() / 1000),
					exp: Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59).getTime() / 1000),
					toe: Math.floor(date.getTime() / 1000),
					txn: id,
					authorization_details: {
						household,
						points,
					}
				}, await getPrivateKey());

				const qr = createGIFBlob(token, { border: 4, scale: 4 });
				const qrURL = getQRCodeURL(token);

				const message = new SlackMessage(await store.PANTRY_SLACK_URL,
					new SlackHeaderBlock(new SlackPlainTextElement('New Food Pantry Appointment')),
					new SlackSectionBlock(new SlackPlainTextElement(`Date: ${date.toLocaleString('en', FORMAT)}`), {
						fields: [
							new SlackMarkdownElement(`*Name*: ${name}`),
							new SlackMarkdownElement(`*Phone*: ${data.has('telephone') ? data.get('telephone') : 'Not given'}`),
							new SlackMarkdownElement(`*Points*: ${points}`),
						],
					}),
					new SlackDividerBlock(),
					new SlackContextBlock({ elements: [
						new SlackPlainTextElement(data.get('comments') || 'No Comments'),
					]}),
					new SlackImageBlock(qrURL.href, { alt: 'QR Code for JWT'}),
					data.has('email') ? new SlackActionsBlock({
						elements: [
							new SlackButtonElement(new SlackPlainTextElement(`Reply to <${data.get('email')}>`), {
								url: `mailto:${data.get('email')}`,
								action: `email-${nowId}`,
								style: SLACK_PRIMARY,
							}),
						]
					}) : undefined
				);

				const body = new FormData();
				body.set('id', id);
				body.set('name', name);
				body.set('points', points);
				body.set('message', `${name}, your pantry visit has been created for ${date.toLocaleString('en', FORMAT)}. Your point budget is ${points}. Please bring this QR code with you to check in.`);
				body.set('date', date.toISOString());
				body.set('jwt', token);
				body.set('qr', qr);
				body.set('qr-url', `data:${qr.type};base64,${(await qr.bytes().then(bytes => bytes.toBase64({ alphabet: 'base64' })))}`);

				await message.send({ signal: req.signal }).catch(err => console.error(err));
				return new Response(body);
			}
		} else {
			throw new HTTPBadRequestError(`Missing required fields: ${missing.join(', ')}`);
		}
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
}, {
	logger: console.error,
});
