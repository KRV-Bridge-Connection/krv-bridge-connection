import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';
import { UNAUTHORIZED, FORBIDDEN, OK, NOT_IMPLEMENTED, NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { HTTPError } from '@shgysk8zer0/http/error.js';
import firebase from 'firebase-admin';

const realm = 'krvbridge.org';

export function getAuthError(realm, {
	error,
	errorDescription,
	scope,
} = {}) {
	const parts = [`realm="${realm}"`];

	if (typeof error === 'string') {
		parts.push(`error="${error}"`);
	}

	if (typeof errorDescription === 'string') {
		parts.push(`error_description="${errorDescription}"`);
	}

	if (typeof scope === 'string') {
		parts.push(`scope="${scope}"`);
	} else if (Array.isArray(scope)) {
		parts.push(`scope="${scope.join(' ')}"`);
	}

	return 'Bearer ' + parts.join(', ');
}

async function getFirebase(cert = process.env.FIREBASE_CERT) {
	if (typeof cert !== 'string' || cert.length === 0) {
		throw new HTTPError('Missing Firebase cert.', { status: NOT_IMPLEMENTED });
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		firebase.initializeApp({
			credential: firebase.credential.cert(JSON.parse(atob(cert))),
		});

		return firebase;
	}
}

export async function getAuth(cert = process.env.FIREBASE_CERT) {
	const firebase = await getFirebase(cert);
	return firebase.auth();
}

async function validateToken(token) {
	try {
		const auth = await getAuth();

		return await auth.verifyIdToken(token);
	} catch(err) {
		console.error(err);
	}
}

export async function authenticateRequest(req) {
	const url = new URL(req.url);

	if (req.headers.has('Authorization')) {
		const bearer = req.headers.get('Authorization');

		if (bearer.startsWith('Bearer ')) {
			return await validateToken(req.headers.get('Authorization').substring(7));
		}
	} else if (url.searchParams.has('access_token')) {
		return await validateToken(url.searchParams.get('access_token'));
	}
}

export function hasAuthentication(req) {
	return req.headers.has('Authorization') || new URLSearchParams(req.url).has('access_token');
}

export const handler = createHandler({
	async get(req) {
		if (! hasAuthentication(req)) {
			return Response.json({
				error: {
					message: 'Missing authentication token.',
					status: UNAUTHORIZED,
				}
			}, {
				status: UNAUTHORIZED,
				headers: new Headers({
					'WWW-Authenticate': getAuthError(realm, {
						error: 'invalid_token',
						errorDescription: 'Missing auth token',
					}),
				}),
			});
		} else {
			const user = await authenticateRequest(req);

			if (typeof user !== 'object') {
				return Response.json({
					error: {
						message: 'Invalid token.',
						status: UNAUTHORIZED,
					}
				}, {
					status: UNAUTHORIZED,
					headers: new Headers({
						'WWW-Authenticate': getAuthError(realm, {
							error: 'invalid_token',
							errorDescription: 'Invalid or invalid auth token',
						}),
					}),
				});
			} else if (! user.email_verified) {
				return Response.json({
					error: {
						message: 'Email address not verified.',
						sttauts: FORBIDDEN,
					}
				}, {
					status: FORBIDDEN,
					headers: new Headers({
						'WWW-Authenticate': getAuthError(realm, {
							error: 'invalid_token',
							errorDescription: 'Account not verified',
						}),
					}),
				});
			} else {
				return Response.json(user, { status: OK, statusText: 'Ok' });
			}
		}
	},
	async delete(req) {
		if (! hasAuthentication(req)) {
			return Response.json({
				error: {
					message: 'Missing authentication token.',
					status: UNAUTHORIZED,
				}
			}, {
				status: UNAUTHORIZED,
				headers: new Headers({
					'WWW-Authenticate': getAuthError(realm, {
						error: 'invalid_token',
						errorDescription: 'Missing auth token',
					}),
				}),
			});
		} else {
			const user = await authenticateRequest(req);

			if (typeof user === 'object' && ! Object.is(user, null)) {
				const auth = await getAuth();

				await auth.deleteUser(user.uid);
				return new Response(null, { status: NO_CONTENT, statusText:'No Content' });
			} else {
				return Response.json({
					error: {
						message: 'Not authorized.',
						status: UNAUTHORIZED,
					}
				}, {
					status: UNAUTHORIZED,
					statusText: 'Unauthorized',
					headers: new Headers({
						'WWW-Authenticate': getAuthError(realm, {
							error: 'invalid_token',
							errorDescription: 'Expired or invalid auth token',
						}),
					}),
				});
			}
		}
	},
	allowHeaders: ['Authorization'],
});
