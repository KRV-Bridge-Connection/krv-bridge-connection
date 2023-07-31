import { initializeApp } from 'firebase/firebase-app.js';
import { firebaseConfig } from '../consts.js';

const apps = new Map();

export function getFirebaseApp(name = 'default') {
	if (apps.has(name)) {
		return apps.get(name);
	} else {
		const app = initializeApp(firebaseConfig);
		apps.set(name, app);
		return app;
	}
}
