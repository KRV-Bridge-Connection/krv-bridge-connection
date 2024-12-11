import '@shgysk8zer0/polyfills';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export async function getSecretKey() {
	const [name, data] = process.env.SECRET_KEY.split(':');
	const bytes = Uint8Array.fromBase64(data);
	const keyData = JSON.parse(new TextDecoder().decode(bytes));

	return await crypto.subtle.importKey('jwk', keyData, { name }, keyData.ext, keyData.key_ops);
}

export async function encrypt(key, str) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt({ name: key.algorithm.name, iv }, key, encoder.encode(str));

	return `${iv.toBase64()}:${new Uint8Array(encrypted).toBase64()}`;
}

export async function decrypt(key, data) {
	const [iv, payload] = data.split(':').map(sect => Uint8Array.fromBase64(sect));
	const decrypted = await crypto.subtle.decrypt({ name: key.algorithm.name, iv }, key, payload);
	return decoder.decode(decrypted);
}

export async function hash(data, algo = 'SHA-256') {
	const hash = await crypto.subtle.digest(algo, encoder.encode(data));
	return `${btoa(algo)}:${new Uint8Array(hash).toHex()}`;
}

export default async () => {
	const [key] = await Promise.all([getSecretKey()]);
	const [data, sig] = await Promise.all([ encrypt(key, process.env.FIREBASE_CERT), hash(process.env.FIREBASE_CERT)]);

	return Response.json({ data, sig });
};
