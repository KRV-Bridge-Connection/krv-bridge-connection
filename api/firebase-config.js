/* eslint-env node */
import '@shgysk8zer0/polyfills';
import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { HTTPInternalServerError } from '@shgysk8zer0/lambda-http/error';

const ALLOWED_ORIGINS = [
	'https://krvbridge.org',
	'https://www.krvbridge.org',
];

if (typeof globalThis?.process?.env?.BASE_URL === 'string') {
	ALLOWED_ORIGINS.push(URL.parse(globalThis.process.env.BASE_URL)?.origin);
}

export default createHandler({
	async get() {
		if (! ('process' in globalThis)) {
			throw new HTTPInternalServerError('process is not defined.');
		} else {
			return Response.json({
				apiKey: globalThis.process.env.FIREBASE_API_KEY,
				authDomain: globalThis.process.env.FIREBASE_AUTH_DOMAIN,
				projectId: globalThis.process.env.FIREBASE_PROJECT_ID,
				storageBucket: globalThis.process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: globalThis.process.env.FIREBASE_MESSAGE_SENDER_ID,
				appId: globalThis.process.env.FIREBASE_APP_ID,
				measurementId: globalThis.process.env.FIREBASE_MEASUREMENT_ID,
			});
		}
	}
}, {
	allowOrigins: ALLOWED_ORIGINS,
	requireCors: true,
});
