/* eslint-env node */
import '@shgysk8zer0/polyfills';
import { createHandler } from '@shgysk8zer0/lambda-http/handler';

const ALLOWED_ORIGINS = [
	'https://krvbridge.org',
	'https://www.krvbridge.org',
];

if (typeof globalThis?.process?.env?.BASE_URL === 'string') {
	ALLOWED_ORIGINS.push(URL.parse(process.env.BASE_URL)?.origin);
}

export default createHandler({
	async get() {
		return Response.json({
			apiKey: process.env.FIREBASE_API_KEY,
			authDomain: process.env.FIREBASE_AUTH_DOMAIN,
			projectId: process.env.FIREBASE_PROJECT_ID,
			storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
			messagingSenderId: process.env.FIREBASE_MESSAGE_SENDER_ID,
			appId: process.env.FIREBASE_APP_ID,
			measurementId: process.env.FIREBASE_MEASUREMENT_ID,
		});
	}
}, {
	allowOrigins: ALLOWED_ORIGINS,
	requireCors: true,
});
