import { ready, toggleClass, css, on } from '@shgysk8zer0/kazoo/dom.js';
import { debounce } from '@shgysk8zer0/kazoo/events.js';
import { init } from '@shgysk8zer0/kazoo/data-handlers.js';
import { SLACK } from './consts.js';
import { navigate } from './functions.js';
import './components.js';
import './user.js';
import './admin.js';

if (! CSS.supports('height', '1dvh')) {
	css([document.documentElement], { '--viewport-height': `${window.innerHeight}px`});

	requestIdleCallback(() => {
		on([window], {
			resize: debounce(() => css([document.documentElement], { '--viewport-height': `${window.innerHeight}px`})),
		}, { passive: true });
	});
}

toggleClass([document.documentElement], {
	'no-dialog': document.createElement('dialog') instanceof HTMLUnknownElement,
	'no-details': document.createElement('details') instanceof HTMLUnknownElement,
	'js': true,
	'no-js': false,
});

Promise.all([
	customElements.whenDefined('install-prompt'),
	ready(),
]).then(([HTMLInstallPromptElement]) => {
	init();

	on('[data-navigate]', 'click', ({ currentTarget }) => navigate(currentTarget.dataset.navigate));

	on('#install-btn', ['click'], () => new HTMLInstallPromptElement().show())
		.forEach(el => el.hidden = false);

	if (location.pathname.startsWith('/contact/')) {
		const params = new URLSearchParams(location.search);

		if (params.has('subject') || params.has('body')) {
			document.querySelector('input[name="subject"]').value = params.get('subject');
			document.querySelector('[name="body"]').value = params.get('body');
		}

		on('#contact-form', 'submit', async event => {
			event.preventDefault();
			const target = event.target;
			const data = new FormData(target);

			const HTMLNotification = customElements.get('html-notification');

			try {
				const resp = await fetch('/api/slack', {
					method: 'POST',
					referrerPolicy: 'origin',
					headers: {
						Authorization: `Bearer ${new TextDecoder().decode(SLACK)}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name: data.get('name'),
						email: data.get('email'),
						phone: data.get('telephone'),
						subject: data.get('subject'),
						body: data.get('body'),
					})
				});

				if (resp.ok) {
					const notification = new HTMLNotification('Message Sent!', {
						body: 'Your message has been sent.',
						icon: '/img/icon-32.png',
						requireInteraction: true,
						actions: [
							{ title: 'Go to Home Page', action: 'home' },
							{ title: 'Dismiss', action: 'dismiss' },
						]
					});

					notification.addEventListener('notificationclick', event => {
						switch(event.action) {
							case 'dismiss':
								event.target.close();
								target.reset();
								break;

							case 'home':
								location.href = '/';
								break;
						}
					});

					requestAnimationFrame(() => notification.hidden = false);

					target.reset();
				} else if (resp.headers.get('Content-Type').startsWith('application/json')) {
					const { error } = await resp.json();

					if ( typeof error?.message === 'string') {
						throw new Error(error.message);
					} else {
						throw new Error('Oops. Something went wrong sending the message.');
					}
				} else {
					throw new Error('Message not sent.');
				}
			} catch(err) {
				console.error(err);
				const notification = new HTMLNotification('Error Sending Message', {
					body: err.message,
				});

				requestAnimationFrame(() => notification.hidden = false);
			}
		});
	}
});
