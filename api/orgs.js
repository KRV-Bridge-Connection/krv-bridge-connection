/* eslint-env node */

import { HTTPError } from '@shgysk8zer0/http/error.js';
import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';
import { BAD_REQUEST, NOT_FOUND, NOT_IMPLEMENTED, NO_CONTENT, UNAUTHORIZED, OK } from '@shgysk8zer0/consts/status.js';
import firebase from 'firebase-admin';

const collection = 'organizations';

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
		throw new HTTPError('Missing Firebase cert in .env', { status: NOT_IMPLEMENTED });
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(atob(process.env.FIREBASE_CERT));
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

export const handler = createHandler({
	get: async req => {
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
	delete: async req => {
		const params = req.searchParams;

		if (! req.cookies.has('token')) {
			throw new HTTPError('You are not allowed to do that.', { status: UNAUTHORIZED });
		} else if (! params.has('id')) {
			throw new HTTPError('Missing required id in query.', { status: BAD_REQUEST });
		} else {
			const firebase = await getFirebase();
			await firebase.auth().verifyIdToken(req.cookies.get('token'));
			await firebase.firestore().collection(collection).doc(params.get('id')).delete();
			return new Response(null, { status: NO_CONTENT });
		}
	}
});
