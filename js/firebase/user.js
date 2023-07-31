import {
	updatePassword as uPassword, updateEmail as uEmail, deleteUser as dUser,
	/*verifyBeforeUpdateEmail, */updateProfile as uProfile,
} from 'firebase/firebase-auth.js';

import { getCurrentUser } from './auth.js';

export async function updatePassword(newPassword) {
	const user = await getCurrentUser();

	if (user) {
		await uPassword(user, newPassword);
	}
}

export async function updateEmail(newEmail) {
	const user = await getCurrentUser();

	if (user) {
		await uEmail(user, newEmail);
	}
}

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
