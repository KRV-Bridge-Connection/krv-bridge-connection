/* eslint-env node */

import { readFile } from 'node:fs/promises';

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
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default async req => {
	try {
		console.log(typeof readFile);
		if (req.method !== 'GET') {
			throw new Error(`Method ${req.method} not supported.`, { status: 501 });
		} else if (! req.headers.has('Referer')) {
			throw new Error('Not allowed.', { status: 403 });
		} else if (! allowedOrigin(req.headers.get('Referer'))) {
			throw new Error('Not allowed.', { status: 403 });
		} else if (! ('process' in globalThis)) {
			throw new Error('`process` is not defined.');
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
		return Response.json({
			error: {
				message: err.message,
				status: 500,
			}
		}, {
			status: 500,
		});
	}
};
