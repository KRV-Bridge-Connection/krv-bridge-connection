import { deleteUser as dUser, updateProfile as uProfile } from 'firebase/firebase-auth.js';

import { getCurrentUser } from './auth.js';

export async function updateProfile({ name: displayName, image: photoURL }) {
	const user = await getCurrentUser();

	if (user) {
		await uProfile(user, { displayName, photoURL });
	}
}

export async function deleteUser() {
	const user = await getCurrentUser();

	if (user) {
		await dUser(user);
	}
}
