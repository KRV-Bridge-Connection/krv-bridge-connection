import { getStorage as init, ref, uploadBytes } from 'firebase/firebase-storage.js';
export { getDownloadURL } from 'firebase/firebase-storage.js';
import { callOnce } from '@shgysk8zer0/kazoo/utility.js';
import { getFirebaseApp } from './app.js';


export const getStorage = callOnce(async () => {
	const app = await getFirebaseApp();
	const storage = init(app);
	return storage;
});

export async function uploadFile(file, path) {
	if (file instanceof File) {
		const storage = await getStorage();
		const storageRef = ref(storage, path);
		return uploadBytes(storageRef, file);
	} else {
		throw new TypeError('Not a file.');
	}
}
