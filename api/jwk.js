import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { importJWK } from '@shgysk8zer0/jwk-utils/jwk';
import { HTTPInternalServerError } from '@shgysk8zer0/lambda-http/error.js';
import { readFile } from 'node:fs/promises';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

export default createHandler({
	async get() {
		const publicKey = await getPublicKey();

		if (publicKey instanceof CryptoKey) {
			const data = await crypto.subtle.exportKey('jwk', publicKey);
			return Response.json(data);
		} else if (publicKey instanceof Error) {
			throw new HTTPInternalServerError('Could not access public JWK.', { cause: publicKey });
		} else {
			throw new HTTPInternalServerError('Could not access public JWK.');
		}
	}
});
