import { getKid, importJWK, MIME_TYPE, verifyJWT } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';
import { createHandler, HTTPBadRequestError, HTTPInternalServerError, HTTPNotFoundError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { deleteCollectionItem, getCollectionItem, putCollectionItem } from './utils';

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);

		if (searchParams.has('kid')) {
			const key = await getCollectionItem('jwks', searchParams.get('kid').trim());
			console.log(key);
			if (typeof key?.kty === 'string') {
				return Response.json(key);
			} else {
				throw new HTTPNotFoundError(`Not key found with id ${searchParams.get('kid')}`);
			}
		} else {
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
	},
	async post(req) {
		if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token.');
		} else {
			const key = await getPublicKey();
			const result = await verifyJWT(req.cookies.get('org-jwt'), key, {
				claims: ['iat', 'exp'],
				entitlements: ['jwk:create'],
				roles: ['admin'],
				scope: 'api',
			});

			if (result instanceof Error) {
				throw new HTTPUnauthorizedError('Token is invalid or expired', { cause: result });
			} else {
				const keyData = await req.json();
				const publicKey = await importJWK(keyData);
				const kid = await getKid(publicKey);
				await putCollectionItem('jwks', kid, keyData);
				return Response.json({ kid }, { status: 201 });
			}
		}
	},
	async delete(req) {
		const { searchParams } = new URL(req.url);

		if (! searchParams.has('kid')) {
			throw new HTTPBadRequestError('Missing required `kid` param.');
		} else if (! req.cookies.has('org-jwt')) {
			throw new HTTPUnauthorizedError('Missing required token.');
		} else {
			const key = await getPublicKey();
			const result = await verifyJWT(req.cookies.get('org-jwt'), key, {
				claims: ['iat', 'exp'],
				entitlements: ['jwk:delete'],
				roles: ['admin'],
				scope: 'api',
			});

			if (result instanceof Error) {
				throw new HTTPUnauthorizedError('Token is invalid or expired', { cause: result });
			} else {
				await deleteCollectionItem('jwks', searchParams.get('kid'));
				return new Response(null, { status: 204 });
			}
		}
	}
});
