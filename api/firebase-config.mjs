/* eslint-env node */

import { HTTPError } from '@shgysk8zer0/http/error.js';
import { FORBIDDEN, INTERNAL_SERVER_ERROR, NOT_IMPLEMENTED } from '@shgysk8zer0/consts/status.js';

const ALLOWED_ORIGINS = [
	'https://krvbridge.org',
	'https://www.krvbridge.org',
	'https://beamish-halva-baf90b.netlify.app'
];

const ALLOWED_DOMAIN_SUFFIXES = [
	'--beamish-halva-baf90b.netlify.app',
	'--beamish-halva-baf90b.netlify.live',
	'.krvbridge.org', // Allows from any subdomains
];

if (typeof globalThis.process.env.BASE_URL === 'string') {
	ALLOWED_ORIGINS.push(new URL(globalThis.process.env.BASE_URL).origin);
}

function allowedOrigin(url) {
	const origin = new URL(url).origin;
	return ALLOWED_ORIGINS.includes(origin)
		|| ALLOWED_DOMAIN_SUFFIXES.some(suff => origin.endsWith(suff));
}

/**
 * @param {Request} req;
 * @returns {Promise<Response>}
 */
export default async req => {
	try {
		if (req.method !== 'GET') {
			throw new HTTPError(`Method ${req.method} not supported.`, { status: NOT_IMPLEMENTED });
		} else if (! req.headers.has('Referer')) {
			throw new HTTPError('Not allowed.', { status: FORBIDDEN });
		} else if (! allowedOrigin(req.headers.get('Referer'))) {
			throw new HTTPError('Not allowed.', { status: FORBIDDEN });
		} else if (! ('process' in globalThis)) {
			throw new HTTPError('`process` is not defined.');
		} else {
			return Response.json({
				apiKey: globalThis.process.env.FIREBASE_API_KEY,
				authDomain: globalThis.process.env.FIREBASE_AUTH_DOMAIN,
				projectId: globalThis.process.env.FIREBASE_PROJECT_ID,
				storageBucket: globalThis.process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: globalThis.process.env.FIREBASE_MESSAGE_SENDER_ID,
				appId: globalThis.process.env.FIREBASE_APP_ID,
				measurementId: globalThis.process.env.FIREBASE_MEASUREMENT_ID,
				// Add other Firebase configuration properties as needed
			});
		}
	} catch(err) {
		if (err instanceof HTTPError) {
			return Response.json({
				error: {
					message: err.message,
					status: err.status,
				}
			}, {
				status: err.status,
				headers: new Headers({ Allow: 'GET' }),
			});
		} else {
			return Response.json({
				error: {
					message: 'An unknown error occurred',
					status: INTERNAL_SERVER_ERROR,
				}
			}, {
				status: INTERNAL_SERVER_ERROR,
			});
		}
	}
};
