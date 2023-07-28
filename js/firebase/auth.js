import {
	getAuth, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
	sendPasswordResetEmail, sendEmailVerification, setPersistence, updateProfile,
	browserLocalPersistence, onAuthStateChanged as onAStateChanged,
} from 'firebase/firebase-auth.js';

import { getFirebaseApp } from './app.js';

const auths = new Map();

const PERSISTENCE = {
	local: browserLocalPersistence,
};

export async function getFirebaseAuth(name = 'default', {
	persistence = 'local',
}) {
	if (auths.has(name)) {
		return auths.get(name);
	} else {
		const app = getFirebaseApp(name);
		const auth = getAuth(app);
		setPersistence(auth, PERSISTENCE[persistence]);
		auths.set(name, auth);
		return auth;
	}
}

export async function register({
	email, password, name: displayName, image: photoURL, verify = true,
}) {
	const auth = await getFirebaseAuth();
	const user = await createUserWithEmailAndPassword(auth, email, password);

	if (typeof displayName === 'string' || typeof photoURL === 'string') {
		await updateProfile(user, { displayName, photoURL });
	}

	if (verify) {
		await sendEmailVerification(user);
	}

	return user;
}

export async function login({
	email, password,
}) {
	const auth = await getFirebaseAuth();
	return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
	const auth = await getFirebaseAuth();
	return signOut(auth);
}

export async function resetPassword(email) {
	const auth = await getFirebaseAuth();

	return sendPasswordResetEmail(auth, email);
}

export async function getCurrentUser() {
	const auth = await getFirebaseAuth();
	return auth.currentUser;
}

export async function isLoggedIn() {
	const user = await getCurrentUser();
	return typeof user === 'object' && ! Object.is(user, null);
}

export async function onAuthStateChanged(callback) {
	const auth = await getFirebaseAuth();
	onAStateChanged(auth, callback);
}

export async function whenLoggedIn() {
	const auth = await getFirebaseAuth();

	if (Object.is(auth.currentUser, null)) {
		const { resolve, promise } = Promise.withResolvers();

		onAStateChanged(auth, user => resolve(user));

		return promise;
	}
}
