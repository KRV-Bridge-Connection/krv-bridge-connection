import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPUnauthorizedError, HTTPNotImplementedError, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { verifyJWT, importJWK } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';
import { SEE_OTHER, CREATED, NOT_FOUND, OK, NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import firebase from 'firebase-admin';

const COLLECTION = 'volunteers_list';

async function getFirebase() {
	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		throw new HTTPNotImplementedError('Missing Firebase cert in .env');
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));
		firebase.initializeApp({ credential: firebase.credential.cert(cert) });

		return firebase;
	}
}

async function getFirestore() {
	const firebase = await getFirebase();
	return firebase.firestore();
}

async function getCollection(collection) {
	const firestore = await getFirestore();
	return firestore.collection(collection);
}

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

function getVolunteerInfo(data) {
	return {
		name: data.get('name'),
		email: data.get('email'),
		phone: data.get('phone'),
		streetAddress: data.get('streetAddress'),
		addressRegion: data.get('addressLocality'),
		registered: new Date(),
		availability: {
			sun: [data.get('sun[start]'), data.get('sun[end]')],
			mon: [data.get('mon[start]'), data.get('mon[end]')],
			tue: [data.get('tue[start]'), data.get('tue[end]')],
			wed: [data.get('wed[start]'), data.get('wed[end]')],
			thu: [data.get('thu[start]'), data.get('thu[end]')],
			fri: [data.get('fri[start]'), data.get('fri[end]')],
			sat: [data.get('sat[start]'), data.get('sat[end]')],
		},
		needsTransportation: data.has('needsTransportation'),
		emergencyName: data.get('emergencyName'),
		emergencyPhone: data.get('emergencyPhone'),
		allergies: data.getAll('allergies'),
		bDay: data.get('bDay'),
		size: data.get('size'),
		interests: data.getAll('interests'),
		skills: data.getAll('skills'),
		notes: data.get('notes'),
		newsletter: data.has('newsletter'),
		agreed: data.has('agreed'),
	};
}

export default createHandler({
	async get(req, { ip, geo }) {
		const token = req.cookies.get('org-jwt');

		if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required credentials/token.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['volunteers:list'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				location: { longitude: geo.longitude, latitude: geo.latitude }
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				const collection = await getCollection(COLLECTION);
				const params = req.searchParams;

				if (params.has('id')) {
					const doc = await collection.doc(params.get('id')).get();

					if (doc.exists) {
						return Response.json(doc.data());
					} else {
						throw new HTTPNotFoundError(`Could not find registration with id ${params.get('id')}`);
					}
				} else {
					const snapshot = await collection.get();
					const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

					return Response.json(docs, { status: docs.length === 0 ? NOT_FOUND : OK });
				}
			}
		}
	},
	async post(req) {
		const data = await req.formData();
		const missing = ['name', 'phone', 'email', 'phone', 'agreed'].filter(field => ! data.has(field));

		if (missing.length !== 0) {
			throw new HTTPBadRequestError('Missing required inputs', { details: { missing }});
		} else if (data.has('id')) {
			const collection = await getCollection(COLLECTION);

			const result = await collection.doc(data.get('id')).update(getVolunteerInfo(data));

			if (typeof result.writeTime === 'undefined') {
				throw new HTTPBadRequestError(`Unable to update document with id of ${data.get('id')}`);
			} else {
				return new Response(null, { status: NO_CONTENT });
			}
		} else {
			const collection = await getCollection(COLLECTION);

			const doc = await collection.add(getVolunteerInfo(data));

			const loc = new URL(req.pathname, req.origin);
			loc.searchParams.set('id', doc.id);

			if (req.mode === 'navigate') {
				return Response.redirect(URL.parse(req.protocol + '//' + req.hostname), SEE_OTHER);
			} else {
				return Response.json({ id: doc.id }, {
					status: CREATED,
					headers: { Location: loc.href },
				});
			}
		}
	},
	async delete(req) {
		const token = req.cookies.get('org-jwt');
		const params = req.searchParams;

		if (! params.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required credentials/token.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['volunteers:delete'],
				claims: ['exp'],
				roles: ['admin'],
				cdniip: ip,
				swname: req.headers.get('User-Agent'),
				location: { longitude: geo.longitude, latitude: geo.latitude }
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				const collection = await getCollection(COLLECTION);
				const result = await collection.doc(params.get('id')).delete();

				if (result.writeTime === undefined) {
					throw new HTTPNotFoundError(`It seems that a registration with id ${params.get('id')} could not be found.`);
				} else {
					return new Response(null, { status: NO_CONTENT });
				}
			}
		}
	}
});
