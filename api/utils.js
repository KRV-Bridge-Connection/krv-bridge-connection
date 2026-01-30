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

export async function getDocumentRef(name, id, { envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	return collection.doc(id);
}

/**
 * @typedef {[key: string, operator: ('=='|'>'|'<'|'>='|'<='|'!='|'in', 'not-in', 'array-contains', 'array-contains-any'), value: any]} FilterTuple
 * A tuple representing a filter: [key, operator, value].
 */

/**
 *
 * @param {string} name
 * @param {object} options
 * @param {number} [options.limit=10] How many items per "page"
 * @param {number} [options.page=1] For pageination
 * @param {string} [options.envName="FIREBASE_CERT"] Env var name to import Firebase credentials from
 * @param {FilterTuple[]} [options.filters]
 * @returns {Promise<object[]>}
 */
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

	const snapshot = Number.isSafeInteger(limit) && limit > 0
		? await query.offset((page - 1) * limit).limit(limit).get()
		: await query.get();

	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 *
 * @param {string} collectionName
 * @param {object[]} documents
 * @param {object} options
 * @param {string} [options.envName]
 * @param {string} [options.idField]
 */
export async function addCollectionItems(collectionName, documents, { envName = ENV_CERT_NAME, idField } = {}) {
	const store = await getFirestore(envName);
	const collection = store.collection(collectionName);

	if (typeof idField === 'string') {
		await store.runTransaction(async (transaction) => {
			for (const document of documents) {
				const docRef = collection.doc(document[idField]);
				  transaction.set(docRef, document);
			}
		});
	} else {
		await store.runTransaction(async (transaction) => {
			for (const document of documents) {
				const docRef = collection.doc();
				  transaction.set(docRef, document);
			}
		});
	}
}

export async function getCollectionItemsBy(name, field, value, { limit = 10, envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	const snapshot = await collection.where(field, '==', value).limit(limit).get();

	return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 *
 * @param {string} name
 * @param {string} field
 * @param {firebase.firestore.WhereFilterOp} operator
 * @param {any} value
 * @returns {Promise<Object[]>}
 */
export async function getCollectionItemsWhere(name, field, operator, value) {
	const collection = await getCollection(name);
	const snapshot = await collection.where(field, operator, value).get();

	if (snapshot.empty) {
		return [];
	} else {
		const results = [];
		snapshot.forEach(result => results.push({ id: result.id, ...result.data() }));
		return results;
	}
}

export async function getCollectionItem(name, id, { envName = ENV_CERT_NAME } = {}) {
	const ref = await getDocumentRef(name, id, { envName });
	const doc = await ref.get();

	if (doc.exists) {
		return { id, ...doc.data() };
	} else {
		return null;
	}
}

export async function putCollectionItem(name, id, data, { envName = ENV_CERT_NAME } = {}) {
	const doc = await getDocumentRef(name, id, { envName });

	return await doc.set(data);
}

export async function addCollectionItem(name, data, { envName = ENV_CERT_NAME } = {}) {
	const collection = await getCollection(name, { envName });
	return await collection.add(data);
}

export async function deleteCollectionItem(name, id, { envName = ENV_CERT_NAME } = {}) {
	const doc = await getDocumentRef(name, id, { envName });
	await doc.delete();
	// Not sure how to tell if anything was actually deleted
	return true;
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

const SUPPORTED_TYPES = ['image/jpeg', 'image/png'];

/**
 *
 * @param {Blob} image
 * @param {object} options
 * @param {string} options.clientId
 * @param {string} [options.referrerPolicy="no-referrer"]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function uploadImage(image, {
	clientId,
	referrerPolicy = 'no-referrer',
	signal,
}) {
	if (typeof clientId !== 'string' || clientId.length === 0) {
		throw new Error('Missing clientId');
	} else if (! (image instanceof Blob)) {
		throw new TypeError('Image must be a `File` or `Blob`.');
	} else if (! SUPPORTED_TYPES.includes(image.type)) {
		throw new TypeError(`Unsupported file type: ${image.type}`);
	} else if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else {
		const resp = await fetch('https://api.imgur.com/3/image', {
			method: 'POST',
			body: image,
			referrerPolicy,
			credentials: 'omit',
			signal,
			headers: new Headers({
				Authorization: `Client-ID ${clientId}`,
				Accept: 'application/json',
			})
		});

		if (resp.ok) {
			const result = await resp.json();
			return result.data;
		} else {
			const { data } = await resp.json()
				.catch(() =>  ({ data: { error: `${resp.url} [${resp.status} ${resp.statusText}]` }}));
			throw new Error(data.error);
		}
	}
}
