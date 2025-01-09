import { HTTPNotImplementedError } from '@shgysk8zer0/lambda-http';
import firebase from 'firebase-admin';
import { importJWK } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';

const ENV_CERT_NAME = 'FIREBASE_CERT';

export const sluggify = str => str.trim()
	.replaceAll(/[^A-Za-z0-9\-\s]/g, '')
	.replaceAll(/\s+/g, ' ')
	.toLowerCase()
	.replaceAll(' ', '-');

export async function getPublicKey(file = '_data/jwk.json') {
	const keyData = JSON.parse(await readFile(file, { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

export async function getFirebase(envName = ENV_CERT_NAME) {
	if (! process.env.hasOwnProperty(envName)) {
		throw new HTTPNotImplementedError('Missing Firebase cert in .env');
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));

		firebase.initializeApp({ credential: firebase.credential.cert(cert) });

		return firebase;
	}
}

export async function getAuth(envName = ENV_CERT_NAME) {
	const firebase = await getFirebase(envName);
	return firebase.auth();
}

export async function getFirestore(envName = ENV_CERT_NAME) {
	const firebase = await getFirebase(envName);
	return firebase.firestore();
}

export async function getCollection(collection, { envName = ENV_CERT_NAME } = {}) {
	const firestore = await getFirestore(envName);
	return firestore.collection(collection);
}

export async function getCollectionItems(name, {
	limit = 10,
	page = 1,
	envName = ENV_CERT_NAME,
	filters,
} = {}) {
	let query = await getCollection(name, { envName });

	if (Array.isArray(filters) && filters.length !== 0) {
		filters.forEach(filter => {
			query = query.where(...filter); // Spread operator for dynamic filters
		  });
	}

	const snapshot = await query.offset((page - 1) * limit).limit(limit).get();

	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCollectionItemsBy(name, field, value, { limit = 10, envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	const snapshot = await collection.where(field, '==', value).limit(limit).get();

	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCollectionItem(name, id, { envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	const doc = await collection.doc(id).get();

	if (doc.exists) {
		return { id, ...doc.data() };
	} else {
		return null;
	}
}

export async function addCollectionItem(name, data, { envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	return await collection.add(data);
}

export async function deleteCollectionItem(name, id, { envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	const result =  await collection.doc(id).delete();

	return result.writeTime > 0;
}

/**
 *
 * @param {Request} req
 */
export async function getFirebaseRequestUser(req) {
	if (req.headers.has('Authorization')) {
		const token = req.headers.get('Authorization').substring(7);
		const auth = await getAuth();
		return await auth.verifyIdToken(token, true);
	} else {
		return null;
	}
}
