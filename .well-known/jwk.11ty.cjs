require('@shgysk8zer0/polyfills');
const { exportAsRFC7517JWK, importJWK, getKid } = require('@shgysk8zer0/jwk-utils');
const firebase = require('firebase-admin');

module.exports.data = () => ({ permalink: '/.well-known/jwks.json' });

module.exports.render = async () => {
	if (firebase.apps.length === 0) {
		const cert = JSON.parse(decodeURIComponent(process.env.FIREBASE_CERT));
		firebase.initializeApp({ credential: firebase.credential.cert(cert) });
	}

	const db = firebase.firestore();
	const snapshot = await db.collection('jwks').get();
	const keys = await Promise.all(snapshot.docs.map(doc => importJWK(doc.data())));
	console.log({ kid: await getKid(keys[0]) });

	return JSON.stringify({
		keys: await Promise.all(keys.map(async publicKey => exportAsRFC7517JWK({ publicKey }, { kid: await getKid(publicKey) })))
	});
};
