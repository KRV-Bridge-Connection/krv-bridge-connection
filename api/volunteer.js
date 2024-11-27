import { createHandler, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import firebase from 'firebase-admin';

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

export default createHandler({
	async post(req) {
		const data = await req.formData();

		if (['name', 'phone', 'email', 'phone', 'streetAddress', 'addressLocality', 'size', 'agreed'].every(field => data.has(field))) {
			const firestore = await getFirestore();

			await firestore.collection('volunteers_list').add({
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

			return new Response(null, { status: 202 });
		} else {
			throw new HTTPBadRequestError('Missing required inputs');
		}
	}
});
