import { HOURS as HOUR } from '@shgysk8zer0/consts/date.js';
import { deleteUser as dUser, updateProfile as uProfile } from 'firebase/firebase-auth.js';

import { getCurrentUser } from './auth.js';

export async function updateProfile({ name: displayName, image: photoURL }) {
	const user = await getCurrentUser();

	if (user) {
		await uProfile(user, { displayName, photoURL });
	}
}

export async function getToken() {
	const user = await getCurrentUser();
	return user.getIdToken();
}

export async function createTokenCookie(name = 'token') {
	const value = await getToken();
	await cookieStore.set({ name, value, expires: Date.now() + HOUR, sameSite: 'strict' });
}

export async function deleteUser() {
	const user = await getCurrentUser();

	if (user) {
		await dUser(user);
	}
}

export async function genOrgToken({ signal } = {}) {
	const token = await getToken();

	if (typeof token === 'string') {
		const resp = await fetch('/api/orgJWT', {
			headers: { Authorization: `Bearer ${token}` },
			signal,
		});

		return resp.ok ? await resp.json() : null;
	} else {
		return null;
	}
}
