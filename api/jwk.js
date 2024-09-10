import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { getPublicKey } from '@shgysk8zer0/jwk-utils/env';
import { HTTPInternalServerError } from '@shgysk8zer0/lambda-http/error.js';

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
