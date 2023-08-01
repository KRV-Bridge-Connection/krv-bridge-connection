export function navigate(pathname, params = {}) {
	const url = new URL(pathname, `${location.origin}${location.pathname}`);

	if (url.origin !== location.origin) {
		throw new Error(`Disallowed origin: ${url.origin}`);
	} else {
		Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
		location.href = url.href;
	}
}
