/* eslint-env node */
import { NOT_FOUND, NO_CONTENT, OK } from '@shgysk8zer0/consts/status.js';
import { verifyJWT, importJWK } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';
import { checkGeohash } from '@shgysk8zer0/geoutils/hash.js';
import firebase from 'firebase-admin';
import {
	createHandler, HTTPBadRequestError, HTTPNotImplementedError, HTTPForbiddenError,
	HTTPUnauthorizedError, HTTPInternalServerError,
} from '@shgysk8zer0/lambda-http';

const collection = 'organizations';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

async function getCollection(name, { limit = 10 } = {}) {
	const db = await getFirestore();
	const snapshot = await db.collection(name).limit(limit).get();

	return snapshot.docs.map(doc => doc.data());
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

async function getItemsBy(collection, field, value, { limit = 10 } = {}) {
	const db = await getFirestore();
	const snapshot = await db.collection(collection).where(field, '==', value).limit(limit).get();

	return snapshot.docs.map(doc => doc.data());
}

async function getFirebase() {
	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		throw new HTTPNotImplementedError('Missing Firebase cert in .env');
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));

		firebase.initializeApp({
			credential: firebase.credential.cert(cert),
		});

		return firebase;
	}
}

async function getFirestore() {
	const firebase = await getFirebase();
	return firebase.firestore();
}

export default createHandler({
	async get(req) {
		const params = req.searchParams;

		if (params.has('id')) {
			const result = await getCollectionItem(collection, params.get('id'));

			if (typeof result === 'object' && ! Object.is(result, null)) {
				return Response.json(result);
			} else {
				return new Response(null, { status: NOT_FOUND });
			}
		} else if (params.has('category')) {
			const results = await getItemsBy(collection, 'subcategory', params.get('category'));

			return Response.json(results, { status: results.length === 0 ? NOT_FOUND : OK });
		} else {
			const orgs = await getCollection(collection);
			return Response.json(orgs);
		}
	},
	async delete(req, { ip, geo } = {}) {
		const params = req.searchParams;

		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token for request.');
		} else if (! params.has('id')) {
			throw new HTTPBadRequestError('Missing required id in query string.');
		} else {
			const publicKey = await getPublicKey();

			const result = await verifyJWT(req.cookies.get('org-jwt'), publicKey, {
				roles: ['admin'],
				entitlements: ['org:delete'],
				claims: ['exp', 'sub_id', 'iss', 'sub'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				sub_id: params.get('id'),
				geohash(hash) {
					return checkGeohash(hash, geo, { radius: 10_000 });
				}
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid token does not have required permissions.', { cause: result });
			} else if (result === null) {
				throw new HTTPInternalServerError('Error parsing request token.');
			} else if (params.get('id') !== result.sub_id) {
				throw new HTTPForbiddenError('You do not have access to that organization.');
			} else {
				const firebase = await getFirebase();
				await firebase.firestore().collection(collection).doc(params.get('id')).delete();
				return new Response(null, { status: NO_CONTENT });
			}
		}
	}
}, {
	allowCredentials: true,
});
