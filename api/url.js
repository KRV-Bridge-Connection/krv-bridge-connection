import { createHandler, HTTPNotFoundError, HTTPForbiddenError, HTTPUnauthorizedError, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import { CREATED, NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import firebase from 'firebase-admin';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

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

async function getFirestore() {
	const firebase = await getFirebase();
	return firebase.firestore();
}

async function getCollectionItem(collection, id) {
	const db = await getFirestore();
	const doc = await db.collection(collection).doc(id).get();

	if (doc.exists) {
		return doc.data();
	} else {
		return null;
	}
}

const collection = 'links';

export default createHandler({
	async get(req) {
		if (! req.searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else {
			const result = await getCollectionItem('links', req.searchParams.get('id'));

			if (URL.canParse(result?.url)) {
				return Response.redirect(result.url);
			} else {
				throw new HTTPNotFoundError(`No link for ${req.searchParams.get('id')} found.`);
			}
		}
	},
	async post(req) {
		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('This request requires a token for authorization.');
		} else {
			const key = await getPublicKey();
			const result = await verifyJWT(req.cookies.get('org-jwt', key, {
				claims: ['exp', 'iss', 'sub_id', 'entitlments'],
				entitlements: ['link:create'],
			}));

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid/expired token or missing required permissions.', { cause: result });
			} else {
				const data = await req.formData();

				if (! URL.canParse(data.get('url'))) {
					throw new HTTPBadRequestError('Invalid or missing URL.');
				} else {
					const db = await getFirestore();
					const docRef = await db.collection(collection).add({
						url: data.get('url'),
						createdAt: new Date(),
						updatedAt: new Date(),
						user: result.sub,
						org: result.sub_id,
					});

					const url = new URL(req.pathname, req.origin);
					url.searchParams.set('id', docRef.id);

					return new Response(null, {
						headers: { Location: url.href },
						status: CREATED,
					});
				}
			}
		}
	},
	async delete(req) {
		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('This request requires a token for authorization.');
		} else if (! req.searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id');
		} else {
			const key = await getPublicKey();
			const result = await verifyJWT(req.cookies.get('org-jwt', key, {
				claims: ['exp', 'iss', 'sub_id', 'entitlments'],
				entitlements: ['link:delete'],
			}));

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid/expired token or missing required permissions.', { cause: result });
			} else {
				if (! URL.canParse(data.get('url'))) {
					throw new HTTPBadRequestError('Invalid or missing URL.');
				} else {
					// @TODO verify `sub_id` matches record `org`
					const db = await getFirestore();
					await db.collection(collection).doc(req.searchParams.get('id')).delete();

					return new Response(null, { status: NO_CONTENT });
				}
			}
		}
	}
}, {
	exposeHeaders: ['Location'],
	allowCredentials: true,
});
