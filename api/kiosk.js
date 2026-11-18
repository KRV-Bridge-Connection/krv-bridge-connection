import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPNotFoundError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { getSecretKey, encrypt, decrypt, BASE64, TEXT } from '@shgysk8zer0/aes-gcm';
import { openSecretStoreFile } from '@aegisjsproject/secret-store';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { checkGeohash } from '@shgysk8zer0/geoutils';
import { putCollectionItem, getCollectionItems, getCollectionItem, getPublicKey, deleteCollectionItem } from './_shared/utils.js';
import { SENTRY_DSN } from './_shared/config.js';
import * as Sentry from '@sentry/node';

Sentry.init({
	dsn: SENTRY_DSN,
	environment: process.env.CONTEXT || 'development',
});

const REQUIRED = ['contact[name]', 'uuid', 'size', 'services[]'];

const DATE_FORMAT = {
	day: 'numeric',
	weekday: 'short',
	month: 'short',
	year: 'numeric',
};

const enc = (key, data) => typeof data === 'string' && data.length !== 0
	? encrypt(key, data, { output: BASE64 })
	: null;

const dec = (key, data) => typeof data === 'string' && data.length !== 0
	? decrypt(key, data, { input: BASE64, output: TEXT })
	: null;

const nameKey = (name, hmacKey) => Promise.try(async () => {
	const bytes = new TextEncoder().encode(name.trim().toLowerCase().normalize('NFKC'));
	const buffer = await crypto.subtle.sign('HMAC', hmacKey, bytes);

	return new Uint8Array(buffer).toBase64({ alphabet: 'base64' });
});

export default createHandler({
	async get(req, { ip, geo }) {
		const { searchParams } = new URL(req.url);

		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token.');
		} else if (! searchParams.has('id')) {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['kiosk:list'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				// This is for anonymous analytics and a WIP.
				// @todo handle data ranges in request instead of fixed dates
				const items = await getCollectionItems('kiosk', {
					limit: 1000,
					filters: [
						['timestamp', '>', new Date('2026-08-01T00:00')],
						['timestamp', '<', new Date('2026-09-01T00:00')]
					]
				});

				const lang = req.headers.has('Accept-Language')
					? req.headers.get('Accept-Language').split(',')[0].trim()
					: 'en-US';

				return Response.json(items.map(item => ({
					timestamp: new Date(item.timestamp._seconds * 1000)
						.toLocaleString(lang, DATE_FORMAT),
					size: item.size,
					partners: item.partners,
					services: item.services,
				})));
			}
		} else {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['kiosk:read'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				const referral = await getCollectionItem('kiosk', searchParams.get('id'));

				if (typeof referral === 'object' && referral !== null) {
					const key = await getSecretKey();

					return Response.json(await Promise.allKeyed({
						name: dec(key, referral.name),
						phone: dec(key, referral.phone),
						timestamp: new Date(referral.timestamp._seconds * 1000).toISOString(),
						email: dec(key, referral.email),
						message: dec(key, referral.message),
						partners: referral.partners,
						services: referral.services,
					}));
				} else {
					throw new HTTPNotFoundError(`No results for ${searchParams.get('id')}`);
				}
			}
		}
	},
	async post(req) {
		const data = await req.formData();

		if (! REQUIRED.every(field => data.has(field))) {
			throw new HTTPBadRequestError('Missing required field(s)', {
				details: { requiredFields: REQUIRED },
			});
		} else {
			const key = await getSecretKey();
			const [secrets] = await openSecretStoreFile(key, '_data/secrets.json');
			const hmacKey = await crypto.subtle.importKey(
				'raw',
				Uint8Array.fromBase64(await secrets.HMAC_SECRET),
				{ name: 'HMAC', hash: 'SHA-384' },
				false,
				['sign'],
			);

			await putCollectionItem('kiosk', data.get('uuid'), await Promise.allKeyed({
				uuid: data.get('uuid'),
				name: enc(key, data.get('contact[name]').trim()),
				nameHash: nameKey(data.get('contact[name]'), hmacKey),
				size: parseInt(data.get('size'), 10),
				phone: enc(key, data.get('contact[phone]')),
				email: enc(key, data.get('contact[email]')),
				message: enc(key, data.get('message')),
				partners: data.getAll('partners[]'),
				services: data.getAll('services[]'),
				// age: parseInt(data.get('contact[age]'), 10),
				details: {
					isHomeless: data.has('contact[homeless]'),
					hasSCEDisconnect: data.has('contact[sce-disconnect]'),
				},
				timestamp: new Date(),
			}));

			return new Response(null, { status: 201 });
		}
	},
	async delete(req, { ip, geo }) {
		const { searchParams } = new URL(req.url);

		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token.');
		} else if (! searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id in request.');
		} else {
			const result = await verifyJWT(req.cookies.get('org-jwt'), await getPublicKey(), {
				entitlements: ['kiosk:delete'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				await deleteCollectionItem('kiosk', searchParams.get('id'));

				return new Response(null, { status: 204 });
			}
		}
	}
}, {
	logger: err =>   Sentry.captureException(err),
});
