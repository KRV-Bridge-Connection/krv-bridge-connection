export function navigate(pathname, params = {}) {
	const url = new URL(pathname, `${location.origin}${location.pathname}`);

	if (url.origin !== location.origin) {
		throw new Error(`Disallowed origin: ${url.origin}`);
	} else {
		Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
		location.href = url.href;
	}
}

export function redirect(params = {}) {
	const search = new URLSearchParams(location.search);
	const pathname = search.get('redirect') || '/';
	navigate(pathname, params);
}

export async function login() {
	const HTMLFirebaseSignInElement = await customElements.whenDefined('firebase-sign-in');
	const user = await HTMLFirebaseSignInElement.asDialog();
	return user;
}

export async function getOrgJWT(user, { signal } = {}) {
	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (user?.getIdToken instanceof Function) {
		const token = await user.getIdToken();

		const resp = await fetch('/api/orgJWT', {
			headers: { Authorization: `Bearer ${token}` },
			credentials: 'include',
			referrerPolicy: 'no-referrer',
			signal,
		});

		if (resp.ok) {
			const { jti, expires } = await resp.json();
			return { tokenId: jti, expires: new Date(expires) };
		} else if (resp.headers.get('Content-Type').startsWith('application/json')) {
			const { error } = await resp.json();
			throw new Error(error.message);
		} else {
			throw new DOMException(`${resp.url} [${resp.status} ${resp.statusText}]`, 'NetworkError');
		}
	} else {
		throw new TypeError('Invalid user object.');
	}
}
