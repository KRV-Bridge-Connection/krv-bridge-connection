/* eslint-env node */
import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';
import { HTTPError } from '@shgysk8zer0/http/error.js';
import { FORBIDDEN } from '@shgysk8zer0/consts/status.js';

const ALLOWED_ORIGINS = [
	'https://krvbridge.org',
	'https://www.krvbridge.org',
	'https://beamish-halva-baf90b.netlify.app'
];

const ALLOWED_DOMAIN_SUFFIXES = [
	'--beamish-halva-baf90b.netlify.app',
	'--beamish-halva-baf90b.netlify.live',
	'.krvbridge.org', // Allows from any subdomain
];

if (typeof process.env.BASE_URL === 'string') {
	ALLOWED_ORIGINS.push(new URL(process.env.BASE_URL).origin);
}

function allowedOrigin(url) {
	const origin = new URL(url).origin;
	return ALLOWED_ORIGINS.includes(origin)
		|| ALLOWED_DOMAIN_SUFFIXES.some(suff => origin.endsWith(suff));
}

export const handler = createHandler({
	get: async req => {
		if (typeof req.referrer !== 'string' || req.headers.has('Origin')) {
			throw new HTTPError('Not allowed.', { status: FORBIDDEN });
		} else if (! allowedOrigin(req.referrer || req.headers.get('Origin'))) {
			throw new HTTPError('Not allowed', { status: FORBIDDEN });
		} else {
			return Response.json({
				apiKey: process.env.FIREBASE_API_KEY,
				authDomain: process.env.FIREBASE_AUTH_DOMAIN,
				projectId: process.env.FIREBASE_PROJECT_ID,
				storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.FIREBASE_MESSAGE_SENDER_ID,
				appId: process.env.FIREBASE_APP_ID,
				measurementId: process.env.FIREBASE_MEASUREMENT_ID,
				// Add other Firebase configuration properties as needed
			});
		}
	}
});
