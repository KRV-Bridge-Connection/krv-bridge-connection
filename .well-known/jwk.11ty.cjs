require('@shgysk8zer0/polyfills');
const { exportAsRFC7517JWKSet, importJWK } = require('@shgysk8zer0/jwk-utils');
const firebase = require('firebase-admin');

module.exports.data = () => ({ permalink: '/.well-known/jwks.json' });

module.exports.render = async () => {
	if (firebase.apps.length === 0) {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));
		firebase.initializeApp({ credential: firebase.credential.cert(cert) });
	}

	const db = firebase.firestore();
	const snapshot = await db.collection('jwks').get();
	const jwks = snapshot.docs.map(doc => doc.data());
	const keys = await Promise.all(jwks.map(jwk => importJWK(jwk)));

	return JSON.stringify(await exportAsRFC7517JWKSet(...keys));
};
