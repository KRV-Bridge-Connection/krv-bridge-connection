import { getFirebaseApp } from './app.js';
import { collection, doc, setDoc, initializeFirestore as initialize } from 'firebase/firebase-firestore.js';
import { callOnce } from '@shgysk8zer0/kazoo/utility.js';

export const initializeFirestore = callOnce(async () => {
	const app = await getFirebaseApp();
	return initialize(app);
});

export async function getCollection(name) {
	const db = await initializeFirestore();
	return collection(db, name);
}

