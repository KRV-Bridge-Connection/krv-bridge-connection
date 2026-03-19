import { verifyJWT, getPrivateKey, createJWT } from '@shgysk8zer0/jwk-utils';
import { getPublicKey } from './utils.js';
import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { createSVGFile } from '@aegisjsproject/qr-encoder';

async function createJWID(key, {
	iss,
	act,
	jti = crypto.randomUUID(),
	identifier: sub_id,
	url: profile,
	honorificPrefix: salutation,
	givenName: given_name,
	additionalName: middle_name,
	familyName: family_name,
	honorificSuffix: title,
	gender,
	nationality: nationalities = [],
	email,
	telephone: phone_number,
	image: picture,
	address: {
		streetAddress: street_address,
		addressLocality: locality,
		addressRegion: region,
		postalCode: postal_code,
		addressCountry: country,
	} = {},
	birthDate: birthdate,
	locale,
	iat = Math.floor(Date.now() / 1000),
} = {}) {
	return await createJWT({
		iss,
		jti,
		act,
		salutation,
		given_name,
		middle_name,
		family_name,
		title,
		birthdate: `${birthdate.getFullYear()}-${(birthdate.getMonth() + 1).toString().padStart(2, '0')}-${birthdate.getDate().toString().padStart(2, '0')}`,
		email,
		phone_number,
		locale,
		picture,
		sub_id,
		profile,
		gender,
		nationalities,
		address: { street_address, locality, region, postal_code, country },
		iat,
	}, key);
}

const JWT = 'org-jwt';

export default createHandler({
	async post(req) {
		const data = await req.formData();
		if (! ['givenName', 'familyName', 'gender', 'birthDate'].every(field => data.has(field))) {
			throw new HTTPBadRequestError('Missing required fields.');
		} else if (! req.cookies.has(JWT)) {
			throw new HTTPUnauthorizedError('Missing required token.');
		} else {
			const result = await verifyJWT(req.cookies.get(JWT), await getPublicKey(), {
				entitlements: ['jwid:create'],
				roles: ['admin'],
				scope: 'api',
				claims: ['exp', 'sub', 'sub_id', 'email', 'name', 'picture'],
			}).catch(err => new Error('Error validating JWT', { cause: err }));

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to create IDs or your token is expired.', { cause: result });
			} else {
				const token = await createJWID(await getPrivateKey(), {
					identifier: data.get('identifier'),
					url: data.get('url'),
					iss: URL.parse(req.url)?.origin,
					act: {
						sub: result.sub,
						iss: result.iss,
						jti: result.jti,
					},
					honorificPrefix: data.get('honorificPrefix'),
					givenName: data.get('givenName'),
					additionalName: data.get('additionalName'),
					familyName: data.get('familyName'),
					honorificSuffix: data.get('honorificSuffix'),
					gender: data.get('gender'),
					nationality: data.getAll('nationality'),
					locale: req.headers.get('Accept-Language')?.split(',')?.[0]?.split(';')?.[0] ?? 'en-us',
					email: data.get('email'),
					telephone: data.get('telephone'),
					image: data.get('image'),
					address: {
						streetAddress: data.get('address[streetAddress]'),
						addressLocality: data.get('address[addressLocality]'),
						addressRegion: data.get('address[addressRegion]'),
						postalCode: data.get('address[postalCode]'),
						addressCountry: data.get('address[addressCountry]'),
					},
					birthDate: new Date(data.get('birthDate') + 'T00:00'),
				});

				const file = createSVGFile(token);

				return new Response(file, { headers: { 'Content-Type': file.type }});
			}
		}
	}
}, {
	logger: console.error,
});
