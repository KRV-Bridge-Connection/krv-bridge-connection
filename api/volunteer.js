import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPUnauthorizedError, HTTPNotImplementedError, HTTPNotFoundError } from '@shgysk8zer0/lambda-http';
import { verifyJWT, importJWK } from '@shgysk8zer0/jwk-utils';
import { readFile } from 'node:fs/promises';
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

export default createHandler({
	async get(req) {
		const token = req.cookies.get('org-jwt');

		if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required credentials/token.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), { entitlements: ['volunteers:list'], claims: ['exp'] });

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

					return Response.json(docs, { status: docs.length === 0 ? 404 : 200 });
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

			const result = await collection.doc(data.get('id')).update({
				name: data.get('name'),
				email: data.get('email'),
				phone: data.get('phone'),
				streetAddress: data.get('streetAddress'),
				addressRegion: data.get('addressLocality'),
				registered: new Date(),
				days: data.getAll('days'),
				times: data.getAll('times'),
				hours: parseInt(data.get('hours')),
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
			});

			if (typeof result.writeTime === 'undefined') {
				throw new HTTPBadRequestError(`Unable to update document with id of ${data.get('id')}`);
			} else {
				return new Response(null, { status: 204 });
			}
		} else {
			const collection = await getCollection(COLLECTION);

			const doc = await collection.add({
				name: data.get('name'),
				email: data.get('email'),
				phone: data.get('phone'),
				streetAddress: data.get('streetAddress'),
				addressRegion: data.get('addressLocality'),
				registered: new Date(),
				days: data.getAll('days'),
				times: data.getAll('times'),
				hours: parseInt(data.get('hours')),
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
			});

			const loc = new URL(req.pathname, req.origin);
			loc.searchParams.set('id', doc.id);

			return Response.json({ id: doc.id }, {
				status: 201,
				headers: { Location: loc.href },
			});
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
			const result = await verifyJWT(token, await getPublicKey(), { entitlements: ['volunteers:delete'], claims: ['exp'] });

			if (result instanceof Error) {
				throw new HTTPForbiddenError('You do not have permission to access this data.', { cause: result });
			} else {
				const collection = await getCollection(COLLECTION);
				const result = await collection.doc(params.get('id')).delete();

				if (result.writeTime === undefined) {
					throw new HTTPNotFoundError(`It seems that a registration with id ${params.get('id')} could not be found.`);
				} else {
					return new Response(null, { status: 204 });
				}
			}
		}
	}
});
