import { on } from '@shgysk8zer0/kazoo/dom.js';
// import { getJSON } from '@shgysk8zer0/kazoo/http.js';
import { initialize } from '@shgysk8zer0/components/firebase/auth/auth.js';
import { createGravatarURL } from '@shgysk8zer0/kazoo/gravatar.js';
import { login, register, getFirebaseAuth } from './firebase/auth.js';
import { alert } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { navigate } from './functions.js';

getFirebaseAuth().then(auth => initialize(auth));

async function storeCredentials({ email, password, name, image }) {
	if ('credentials' in navigator) {
		try {
			const creds = new PasswordCredential({ id: email, password, name, iconURL: image });
			const stored = await navigator.credentials.store(creds);
			console.log(stored);
			return true;
		} catch(err) {
			console.error(err);
			return false;
		}
	} else {
		return false;
	}
}

on('#registration-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const creds = {
		name: data.get('name'),
		email: data.get('email'),
		password: data.get('password'),
		image: await createGravatarURL(data.get('email')).then(url => url.href),
	};
	const user = await register(creds)
		.then(() => storeCredentials(creds))
		.catch(err => alert(err.message));

	if (typeof user === 'object' && ! Object.is(user, null)) {
		const params = new URLSearchParams(location.search);

		if (params.has('redirect')) {
			navigate(params.get('redirect'));
		} else {
			navigate('/');
		}
	} else {
		alert('Error creating account');
	}
});

on('#login-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const creds = {
		email: data.get('email'),
		password: data.get('password'),
	};

	const user = await login(creds).catch(err => alert(err.message));

	if (typeof user === 'object' && ! Object.is(user, null)) {
		await storeCredentials({
			email: creds.email,
			password: creds.password,
			image: user.photoURL,
			name: user.displayName,
		});

		const params = new URLSearchParams(location.search);

		if (params.has('redirect')) {
			navigate(params.get('redirect'));
		} else {
			navigate('/');
		}
	} else {
		alert('Error creating account');
	}
});
