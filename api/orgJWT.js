import { createHandler, HTTPBadGatewayError, HTTPForbiddenError, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { getPrivateKey, createJWT, getRequestToken } from '@shgysk8zer0/jwk-utils';
import firebase from 'firebase-admin';

async function getFirebase() {
	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		throw new HTTPNotImplementedError('Missing Firebase cert in .env');
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));

		firebase.initializeApp({ credential: firebase.credential.cert(cert) });

		return firebase;
	}
}

export default createHandler({
	async get(req) {
		const reqToken = getRequestToken(req);
		const firebase = await getFirebase();
		const auth = firebase.auth();
		const user = await auth.verifyIdToken(reqToken, true).catch(err => {
			return new HTTPForbiddenError('Invalid id token', { cause: err });
		});

		if (user instanceof Error) {
			throw user;
		} else if (! (typeof user.email === 'string' && typeof user.uid === 'string')) {
			throw new HTTPBadGatewayError('Invalid token data');
		} else if (! user.email_verified) {
			auth.generateEmailVerificationLink(user.email)
			throw new HTTPForbiddenError('You will need to verify your email address and try again. An verification email has been sent.');
		} else {
			const { uid, name, picture, email, email_verified, phone_number } = user;

			const db = firebase.firestore();
			const doc = await db.collection('users').doc(uid).get();

			if (doc.exists) {
				const { org: sub_id, entitlements, roles, birthdate, website } = doc.data();
				const key = await getPrivateKey();
				const now = Math.floor(Date.now() / 1000);
				const origin = URL.parse(req.url)?.origin;
				const token = await createJWT({
					iss: origin,
					aud: origin,
					sub: uid,
					iat: now,
					nbf: now,
					exp: now + 1_800,
					jti: crypto.randomUUID(),
					sub_id,
					name,
					picture,
					email,
					email_verified,
					phone_number,
					website: website,
					birthdate: birthdate,
					scope: 'api',
					roles,
					entitlements,
				}, key);

				return new Response([token]);
			} else {
				throw new HTTPNotFoundError(`No user record exists for user ${uid}.`);
			}
		}
	}
}, {
	allowCredentials: true,
	requireJWT: true,
});
