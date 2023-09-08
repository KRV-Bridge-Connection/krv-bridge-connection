import { initializeApp } from 'firebase/firebase-app.js';
import { getJSON } from '@shgysk8zer0/kazoo/http.js';
// import { firebaseConfig } from '../consts.js';

const apps = new Map();

export async function getFirebaseApp(name = 'default') {
	if (apps.has(name)) {
		return apps.get(name);
	} else {
		const config = await getJSON('/api/firebase-config', { mode: 'same-origin', referrerPolicy: 'same-origin' });
		const app = initializeApp(config);
		apps.set(name, app);
		return app;
	}
}
