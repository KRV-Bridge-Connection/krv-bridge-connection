import { HOURS as HOUR } from '@shgysk8zer0/consts/date.js';
import { getIdToken } from '@aegisjsproject/firebase-account-routes/auth.js';
import { ORG_TOKEN_KEY } from '../consts.js';

export async function createTokenCookie(name = 'token') {
	const value = await getIdToken();
	await cookieStore.set({ name, value, expires: Date.now() + HOUR, sameSite: 'strict' });
}

export const hasOrgToken = () => localStorage.hasOwnProperty(ORG_TOKEN_KEY);

export const hasValidOrgToken = () => hasOrgToken() && (parseInt(localStorage.getItem(ORG_TOKEN_KEY)) || -1) > Date.now();

export async function genOrgToken({ signal } = {}) {
	if (hasValidOrgToken()) {
		return Math.max(parseInt(localStorage.getItem(ORG_TOKEN_KEY), 0)) || -1;
	} else {
		const token = await getIdToken();

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
