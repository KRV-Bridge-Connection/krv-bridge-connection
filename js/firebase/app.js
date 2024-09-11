import { initializeApp } from 'firebase/firebase-app.js';
import { getJSON } from '@shgysk8zer0/kazoo/http.js';

const apps = new Map();

export async function getFirebaseApp(name = 'default') {
	if (apps.has(name)) {
		return apps.get(name);
	} else {
		const config = await getJSON('/api/firebase-config', { referrerPolicy: 'origin' });
		const app = initializeApp(config);
		apps.set(name, app);
		return app;
	}
}
