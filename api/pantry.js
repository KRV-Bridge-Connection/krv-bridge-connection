import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPNotFoundError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { getPrivateKey, createJWT } from '@shgysk8zer0/jwk-utils';
import { deleteCollectionItem, getCollectionItem, getCollectionItems, getFirestore, getPublicKey, putCollectionItem } from './utils.js';
import { encrypt, decrypt, BASE64, getSecretKey } from '@shgysk8zer0/aes-gcm';
import { NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { getSUID } from '@shgysk8zer0/suid';
import { useSecretStore } from '@aegisjsproject/secret-store';
import { readFile } from 'node:fs/promises';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_PRIMARY, SlackImageBlock,
} from '@shgysk8zer0/slack';

async function getSecretStore(key) {
	const file = await readFile('_data/secrets.json', { encoding: 'utf8' });
	const [store] = useSecretStore(key, JSON.parse(file));
	return store;
}

const QZONE = 7;

const FORMAT = {
	dateStyle: 'medium',
	timeStyle: 'short',
};

const COLLECTION = 'pantry-schedule';

const PTS = [
	30, // 1
	60, // 2
	80, // 3
	100, // 4
	115, // 5
	130, // 6
	140, // 7
	150, // 8
];

const _getPoints = household => PTS[Math.min(Math.max(parseInt(household), 1), PTS.length) - 1];

export const QRSERVER = 'https://api.qrserver.com/';

const REPLACEMENTS = {
	'CH': 'K',
	'CK': 'K',
	'C': 'K',
	'PH': 'F',
};

const PHONETIC_PATTERN = new RegExp(Object.keys(REPLACEMENTS).join('|'), 'g');

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

async function getRecentVisits(name, date = new Date()) {
	const db = await getFirestore();
	const prior = getLastMonth(date);

	const snapshot = await db.collection(COLLECTION)
		.where('extra_trip', '==', false)
		.where('_name', '==', normalizeName(name))
		.where('date', '>', prior)
		.count()
		.get();

	return snapshot.data().count;
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

// const _escapeCSV = str => typeof str === 'string' || typeof str === 'number' ? `"${str.toString().replaceAll('"', '""')}"` : '""';
// const _escapeRow = row => row.map(_escapeCSV).join(',') + '\n';
// const _decrypt = async (key, field) => typeof field === 'string' && field.length !== 0
// 	? await decrypt(key, field, { output: TEXT })
// 	: null;

// async function _toCSVRow(key, { name, date, addressLocality, postalCode, email, telephone, comments, household }) {
// 	return _escapeRow([
// 		name,
// 		new Date(date._seconds * 1000).toISOString(),
// 		addressLocality,
// 		postalCode,
// 		await _decrypt(key, email),
// 		await _decrypt(key, telephone),
// 		await _decrypt(key, comments),
// 		household,
// 	]);
// }

// async function _createCSVFile(records, name) {
// 	const key = await getSecretKey();
// 	const rows = await Promise.all(records.map(record => _toCSVRow(key, record)));
// 	return new File(rows, name, { type: 'text/csv' });
// }

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
				const count = await getRecentVisits(searchParams.get('name'));

				return Response.json({ count, allowed: count < 2, since: new Date().toISOString() });
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
			'givenName', 'familyName', 'household', 'addressLocality', 'postalCode', 'date', 'time',
		].filter(field => ! data.has(field));

		if (missing.length === 0) {
			const date = new Date(data.has('datetime') ? data.get('datetime') : `${data.get('date')}T${data.get('time')}`);
			const household = Math.min(Math.max(parseInt(data.get('household')), 1), 8);

			if (Number.isNaN(date.getTime())) {
				throw new HTTPBadRequestError('Invalid date/time given.');
			} else if (! Number.isSafeInteger(household) || household < 1 || household > 8) {
				throw new HTTPBadRequestError(`Invalid household size: ${data.get('household')}.`);
			} else {
				const key = await getSecretKey();
				const store = await getSecretStore(key);

				const [streetAddress, email = null, telephone = null, comments = null] = await Promise.all(
					['streetAddress', 'email', 'telephone', 'comments']
						.map(field => data.get(field) ?? null)
						.map(field => typeof field === 'string' && field.length !== 0 ? encrypt(key, field, { output: BASE64 }) : null)
				);

				const created = new Date();
				const id = getSUID({ date: created, alphabet: 'base64url' });
				const recentVists = await getRecentVisits(`${data.get('givenName')} ${data.get('familyName')}`);
				const normalTrip = recentVists < 2;
				const points = normalTrip ? _getPoints(household) : household * 5;

				await putCollectionItem(COLLECTION, id, {
					givenName: data.get('givenName'),
					additionalName: data.get('additionalyName'),
					familyName: data.get('familyName'),
					_name: normalizeName(`${data.get('givenName')} ${data.get('familyName')}`),
					name: ['givenName', 'additionalName', 'familyName']
						.map(field => data.get(field))
						.filter(field => typeof field === 'string' && field.length !== 0)
						.join(' '),
					email,
					telephone,
					streetAddress,
					addressLocality: data.get('addressLocality'),
					postalCode: data.get('postalCode'),
					household: parseInt(data.get('household')),
					comments,
					created,
					extra_trip: ! normalTrip,
					date,
					points,
				});

				const nowId = Date.now().toString(34);

				const token = await createJWT({
					iss: 'krvbridge.org',
					scope: 'pantry',
					entitlements: ['pantry:use'],
					roles: ['guest'],
					// sub: `${data.get('givenName')} ${data.get('familyName')}`,
					given_name: data.get('givenName'),
					family_name: data.get('familyName'),
					iat: Math.floor(created.getTime() / 1000),
					nbf: Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime() / 1000),
					exp: Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59).getTime() / 1000),
					toe: Math.floor(date.getTime() / 1000),
					txn: id,
					authorization_details: {
						household,
						points,
					}
				}, await getPrivateKey());

				const qrURL = getQRCodeURL(token);
				const qr = await fetch(qrURL, {
					headers: { Accept: 'image/png' },
					referrerPolicy: 'no-referrer',
					mode: 'cors',
					signal: req.signal,
				}).then(resp => resp.blob());

				const message = new SlackMessage(await store.PANTRY_SLACK_URL,
					new SlackHeaderBlock(new SlackPlainTextElement('New Food Pantry Appointment')),
					new SlackSectionBlock(new SlackPlainTextElement(`Date: ${date.toLocaleString('en', FORMAT)}`), {
						fields: [
							new SlackMarkdownElement(`*Name*: ${data.get('givenName')} ${data.get('familyName')}`),
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
				body.set('message', `Your appointment has been scheduled for ${date.toLocaleString('en', FORMAT)}. Your point budget is ${points}. Please bring this QR code with you to check in.`);
				body.set('date', date.toISOString());
				body.set('qr', qr);

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
});
