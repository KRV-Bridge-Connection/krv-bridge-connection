const { exportAsRFC7517JWKSet, importJWK } = require('@shgysk8zer0/jwk-utils');
const firebase = require('firebase-admin');
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { initializeFirestore } = require('firebase-admin/firestore');

module.exports.data = () => ({ permalink: '/.well-known/jwks.json' });

module.exports.render = async () => {
	if (getApps().length === 0) {
		const certObj = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));
		initializeApp({ credential: cert(certObj) });
	}

	const db = initializeFirestore(getApp());
	const snapshot = await db.collection('jwks').get();
	const jwks = snapshot.docs.map(doc => doc.data());
	const keys = await Promise.all(jwks.map(jwk => importJWK(jwk)));

	return JSON.stringify(await exportAsRFC7517JWKSet(...keys));
};
