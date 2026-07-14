import { createHandler, HTTPBadGatewayError, HTTPForbiddenError, HTTPNotFoundError, Cookie } from '@shgysk8zer0/lambda-http';
import { verifyFirebaseAuthRequestToken } from '@shgysk8zer0/jwk-utils';
import { getPrivateKey, createJWT } from '@shgysk8zer0/jwk-utils';
import { encodeGeohash } from '@shgysk8zer0/geoutils';
import { getFirestore } from './utils.js';

const cookieName = 'org-jwt';
const path = '/api/';
const sameSite = 'strict';
const secure = true;
const httpOnly = true;
const partitioned = true;

export default createHandler({
	async get(req, {
		ip = null,
		geo: { latitude = NaN, longitude = NaN, timezone = null } = {},
	} = {}) {
		const user = await verifyFirebaseAuthRequestToken(req).catch(err => {
			return new HTTPForbiddenError('Invalid id token', { cause: err });
		});

		if (user instanceof Error) {
			throw user;
		} else if (! (typeof user.email === 'string' && typeof user.sub === 'string')) {
			throw new HTTPBadGatewayError('Invalid token data');
		} else if (! user.email_verified) {
			// @todo resend verification email since `firebase-admin/auth` is broken thanks to jose/require()
			throw new HTTPForbiddenError('You will need to verify your email address and try again. An verification email has been sent.');
		} else {
			const { sub: uid, name, email, picture, email_verified } = user;

			const db = await getFirestore();
			const doc = await db.collection('users').doc(uid).get();

			if (doc.exists) {
				const { org: orgRef = null, entitlements = [], roles = [] } = doc.data();
				const key = await getPrivateKey();
				const now = Math.floor(Date.now() / 1000);
				const origin = URL.parse(`${req.protocol}//${req.hostname}`)?.origin;
				const jti = crypto.randomUUID();
				const expires = new Date(Date.now() + 1_800_000).getTime();
				const subId = (await orgRef?.get?.())?.data?.()?.id;

				const token = await createJWT({
					iss: origin,
					aud: origin,
					sub: uid,
					iat: now,
					nbf: now,
					exp: Math.floor(expires / 1000),
					jti,
					sub_id: subId,
					name,
					email,
					email_verified,
					picture,
					scope: 'api',
					roles: Array.isArray(roles) ? roles : [roles],
					entitlements,
					geohash: encodeGeohash({ latitude, longitude }, 6),
					swname: req.headers.get('User-Agent'),
					cdniip: ip,
					zoneinfo: timezone,
				}, key);

				const cookie = new Cookie({
					name: cookieName,
					value: token,
					expires,
					path,
					sameSite,
					secure,
					httpOnly,
					partitioned,
				});

				return Response.json({ expires, jti }, {
					headers: new Headers({ 'Set-Cookie': cookie }),
				});
			} else {
				throw new HTTPNotFoundError(`No user record exists for user ${uid}.`);
			}
		}
	},
	// For logout
	async delete() {
		const cookie = new Cookie({
			name: cookieName,
			value: null,
			expires: -1,
			path,
			sameSite,
			secure,
			httpOnly,
			partitioned,
		});

		return new Response(null, {
			headers: { 'Set-Cookie': cookie },
			status: 201,
		});
	}
}, {
	allowCredentials: true,
	logger: console.error,
});
