import { on } from '@shgysk8zer0/kazoo/dom.js';
import { createGravatarURL } from '@shgysk8zer0/kazoo/gravatar.js';
import { login, register } from './firebase/auth.js';
import { alert } from '@shgysk8zer0/kazoo/asyncDialog.js';

on('#registration-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const user = await register({
		name: data.get('name'),
		email: data.get('email'),
		password: data.get('password'),
		image: await createGravatarURL(data.get('email')).then(url => url.href),
	}).catch(err => {
		alert(err.message);
	});

	if (typeof user === 'object' && ! Object.is(user, null)) {
		const params = new URLSearchParams(location.search);

		if (params.has('redirect')) {
			location.href = params.get('redirect');
		} else {
			location.href = '/';
		}
	} else {
		alert('Error creating account');
	}
});

on('#login-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);

	const user = await login({
		email: data.get('email'),
		password: data.get('password'),
	}).catch(err => {
		alert(err.message);
	});

	if (typeof user === 'object' && ! Object.is(user, null)) {
		const params = new URLSearchParams(location.search);

		if (params.has('redirect')) {
			location.href = params.get('redirect');
		} else {
			location.href = '/';
		}
	} else {
		alert('Error creating account');
	}
});
