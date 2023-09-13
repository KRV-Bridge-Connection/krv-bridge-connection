/* eslint-env node */

const collection = 'organizations';

async function getCollection(name, { limit = 10 } = {}) {
	const db = getFirestore();
	const snapshot = await db.collection(name).limit(limit).get();
	const items = [];

	snapshot.forEach(doc => items.push(doc.data()));

	return items;
}

async function getCollectionItem(collection, id) {
	const db = getFirestore();
	const doc = await db.collection(collection).doc(id).get();

	if (doc.exists) {
		return doc.data();
	} else {
		return null;
	}
}

function getFirebase() {
	const firebase = require('firebase-admin');

	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		throw new Error('Missing Firebase cert in .env');
	} else if (firebase.apps.length !== 0) {
		return firebase.apps[0];
	} else {
		const cert = JSON.parse(atob(process.env.FIREBASE_CERT));
		firebase.initializeApp({
			credential: firebase.credential.cert(cert),
		});

		return firebase;
	}
}

function getFirestore() {
	const firebase = getFirebase();
	return firebase.firestore();
}

exports.handler = async event => {
	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
			body: JSON.stringify({
				error: {
					status: 500,
					message: 'Missing Firebase Certificate',
				}
			})
		};
	}

	switch(event.httpMethod) {
		case 'GET':
			if (event.queryStringParameters.hasOwnProperty('id')) {
				const result = await getCollectionItem(collection, event.queryStringParameters.id);
				if (typeof result === 'object' && ! Object.is(result, null)) {
					return {
						statusCode: 200,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Content-Security-Policy': 'default-src \'self\'',
						},
						body: JSON.stringify(result),
					};
				} else {
					return {
						statusCode: 404,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Content-Security-Policy': 'default-src \'self\'',
						},
						body: 'null',
					};
				}
			} else {
				const orgs = await getCollection(collection);
				return {
					statusCode: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
					body: JSON.stringify(orgs)
				};
			}

		case 'DELETE':
			if (! event.headers.hasOwnProperty('authorization')) {
				return {
					statusCode: 401,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
					body: JSON.stringify({
						error: {
							status: 401,
							message: 'You are not authorized to do that.',
						}
					})
				};
			} else if (! event.queryStringParameters.hasOwnProperty('id')) {
				return {
					statusCode: 400,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
					body: JSON.stringify({
						error: {
							status: 400,
							message: 'Missing required id in query.'
						}
					})
				};
			} else {
				const firebase = getFirebase();
				const idToken = event.headers.authorization.replace('Bearer ', '');
				try {
					await firebase.auth().verifyIdToken(idToken);
					await firebase.firestore().collection(collection).doc(event.queryStringParameters.id).delete();
					return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }};
				} catch(err) {
					console.error(err);
					return {
						statusCode: 500,
						headers: {
							'Access-Control-Allow-Origin': '*',
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							error: {
								status: 500,
								message: err.message,
							}
						})
					};
				}
			}
	}
};
