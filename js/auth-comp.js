import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

export class FirebaseAuthElement extends HTMLElement {
	static #app;
	static #initialized = Promise.withResolvers();
	static #user = null;

	get whenInitialized() {
		return FirebaseAuthElement.#initialized.promise;
	}

	async signIn(email, password) {
		const auth = await this.#getAuth();
		FirebaseAuthElement.#user = await signInWithEmailAndPassword(auth, email, password);
	}

	async signOut() {
		const auth = await this.#getAuth();
		signOut(auth);
		FirebaseAuthElement.#user = null;
	}

	async #getAuth() {
		await this.whenInitialized;
		return getAuth(FirebaseAuthElement.#app);
	}

	static setFirebaseConfig(config) {
		try {
			FirebaseAuthElement.#app = initializeApp(config);
			FirebaseAuthElement.#initialized.resolve();
		} catch(err) {
			FirebaseAuthElement.#initialized.reject(err);
		}
	}

	static log() {
		console.log(FirebaseAuthElement.#user);
	}
}
