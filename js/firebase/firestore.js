import { getFirebaseApp } from './app.js';
import { collection, doc, setDoc, getDoc, getDocs, getFirestore } from 'firebase/firebase-firestore.js';
import { callOnce } from '@shgysk8zer0/kazoo/utility.js';

export const initializeFirestore = callOnce(async () => {
	const app = await getFirebaseApp();
	return getFirestore(app);
});

export async function getCollection(name) {
	const db = await initializeFirestore();
	return collection(db, name);
}

export async function getSingleDoc(collectionName, id) {
	const db = await initializeFirestore();
	const ref = doc(db, collectionName, id);
	const snap = await getDoc(ref);

	if (snap.exists()) {
		return snap.data();
	} else {
		return null;
	}
}

export async function getAll(collectionName) {
	const ref = await getCollection(collectionName);
	const docs = await getDocs(ref);
	const data = [];

	docs.forEach(doc => data.push(doc.data()));

	return data;
}

export async function createOrUpdateDoc(collectionName, id, data) {
	const db = await initializeFirestore();
	const ref = doc(db, collectionName, id);

	try {
		await setDoc(ref, data);
		return true;
	} catch(err) {
		console.error(err);
		return false;
	}
}
