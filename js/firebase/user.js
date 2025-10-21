import { HOURS as HOUR } from '@shgysk8zer0/consts/date.js';
import { deleteUser as dUser, updateProfile as uProfile } from 'firebase/firebase-auth.js';
import { getCurrentUser } from './auth.js';
import { ORG_TOKEN_KEY } from '../consts.js';

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

export const hasOrgToken = () => localStorage.hasOwnProperty(ORG_TOKEN_KEY);

export const hasValidOrgToken = () => hasOrgToken() && (parseInt(localStorage.getItem(ORG_TOKEN_KEY)) || -1) > Date.now();

export async function genOrgToken({ signal } = {}) {
	if (hasValidOrgToken()) {
		return Math.max(parseInt(localStorage.getItem(ORG_TOKEN_KEY), 0)) || -1;
	} else {
		const token = await getToken();

		if (typeof token === 'string') {
			const resp = await fetch('/api/orgJWT', {
				headers: { Authorization: `Bearer ${token}` },
				signal,
				credentials: 'same-origin',
			});

			if (resp.ok) {
				const { expires } = await resp.json();
				localStorage.setItem(ORG_TOKEN_KEY, expires);
				return expires;
			} else {
				return -1;
			}
		} else {
			return -1;
		}
	}

}
