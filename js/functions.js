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
