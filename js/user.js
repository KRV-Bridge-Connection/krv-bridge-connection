import { on } from '@shgysk8zer0/kazoo/dom.js';
import { createGravatarURL } from '@shgysk8zer0/kazoo/gravatar.js';
import { login, register } from './firebase/auth.js';

on('#registration-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const user = await register({
		name: data.get('name'),
		email: data.get('email'),
		password: data.get('password'),
		image: await createGravatarURL(data.get('email')).then(url => url.href),
	});

	return user;
});

on('#login-form', 'submit', async event => {
	event.preventDefault();
	const data = new FormData(event.target);

	const user = await login({
		email: data.get('email'),
		password: data.get('password'),
	});

	return user;
});
