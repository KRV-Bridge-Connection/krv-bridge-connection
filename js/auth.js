import { getAuth, signOut } from '@shgysk8zer0/components/firebase/auth/auth.js';
import { onAuthStateChanged } from 'firebase/firebase-auth.js';

export function isUser(user) {
	return typeof user === 'object' && user !== null && typeof user.uid === 'string';
}

export async function onSignIn(callback, { signal, once = false, thisObj = globalThis } = {}) {
	if (! (signal instanceof AbortSignal && signal.aborted)) {
		const auth = await getAuth();

		const unsubscribe = onAuthStateChanged(auth, user => {
			if (isUser(user)) {
				callback.call(thisObj, new CustomEvent('sign-in', { detail: user }));

				if (once) {
					unsubscribe();
				}
			}
		});

		if (signal instanceof AbortSignal) {
			signal.addEventListener('abort', () => unsubscribe(), { once: true });
		}
	}
}

export async function onSignOut(callback, { signal, once = false, thisObj = globalThis } = {}) {
	if (! (signal instanceof AbortSignal && signal.aborted)) {
		const auth = await getAuth();

		const unsubscribe = onAuthStateChanged(auth, user => {
			if (! isUser(user)) {
				callback.call(thisObj, new Event('sign-out'));

				if (once) {
					unsubscribe();
				}
			}
		});

		if (signal instanceof AbortSignal) {
			signal.addEventListener('abort', () => unsubscribe(), { once: true });
		}
	}
}

export async function whenSignedIn({ signal } = {}) {
	const { promise, resolve, reject } = Promise.withResolvers();

	if (signal instanceof AbortSignal && signal.aborted) {
		reject(signal.reason);
	} else {
		onSignIn(resolve, { once: true, signal });
	}

	return promise;
}

export async function whenSignedOut({ signal } = {}) {
	const { promise, resolve, reject } = Promise.withResolvers();

	if (signal instanceof AbortSignal && signal.aborted) {
		reject(signal.reason);
	} else {
		onSignOut(resolve, { once: true, signal });
	}

	return promise;
}

export function createSignOutButton() {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.disabled = true;
	onSignIn(() => btn.disabled = false);
	onSignOut(() => btn.disabled = true);
	btn.addEventListener('click', async () => {
		const auth = await getAuth();
		await signOut(auth);
	});

	return btn;
}
