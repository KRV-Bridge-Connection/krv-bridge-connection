import { importJWK, MIME_TYPE } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';
import { createHandler, HTTPInternalServerError } from '@shgysk8zer0/lambda-http';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

export default createHandler({
	async get() {
		const publicKey = await getPublicKey();

		if (publicKey instanceof CryptoKey) {
			const data = await crypto.subtle.exportKey('jwk', publicKey);
			return Response.json(data, { headers: { 'Content-Type': MIME_TYPE }});
		} else if (publicKey instanceof Error) {
			throw new HTTPInternalServerError('Could not access public JWK.');
		} else {
			throw new HTTPInternalServerError('Could not access public JWK.');
		}
	}
});
