/* eslint-env node */
export async function handler(event) {
	const isDevMode = process.env.NETLIFY_DEV === 'true' || process.env.PULL_REQUEST !== undefined;
	const origin = new URL(event.headers.origin || event.headers.referer).origin;
	const allowedOrigins = [
		'https://krvbridge.org',
		'https://www.krvbridge.org',
		'https://beamish-halva-baf90b.netlify.app',
		// Add more allowed domains as needed
	];

	if (
		isDevMode
		&& (origin.endsWith('--beamish-halva-baf90b.netlify.app') || origin.endsWith('--beamish-halva-baf90b.netlify.live'))
	) {
		allowedOrigins.push(origin);
	}

	if (! allowedOrigins.includes(origin)) {
		return {
			statusCode: 403,
			body: JSON.stringify({ error: 'Forbidden' }),
		};
	} else {
		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': origin, // Set the allowed origin in the response headers
			},
			body: JSON.stringify({
				apiKey: process.env.FIREBASE_API_KEY,
				authDomain: process.env.FIREBASE_AUTH_DOMAIN,
				projectId: process.env.FIREBASE_PROJECT_ID,
				storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.FIREBASE_MESSAGE_SENDER_ID,
				appId: process.env.FIREBASE_APP_ID,
				measurementId: process.env.FIREBASE_MEASUREMENT_ID,
				// Add other Firebase configuration properties as needed
			}),
		};
	}
};
