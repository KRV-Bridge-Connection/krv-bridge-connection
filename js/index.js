import { ready, toggleClass, css, on } from '@shgysk8zer0/kazoo/dom.js';
import { debounce } from '@shgysk8zer0/kazoo/events.js';
import { init } from '@shgysk8zer0/kazoo/data-handlers.js';
import { getLocation } from '@shgysk8zer0/kazoo/geo.js';
import { SLACK } from './consts.js';
import { navigate } from './functions.js';
import { EVENT_TYPES, NAV_EVENT, init as initRouter } from '@aegisjsproject/router/router.js';
import { observeEvents } from '@aegisjsproject/callback-registry/events.js';
import './components.js';
import './user.js';
import './admin.js';

initRouter({
	'/volunteer/': '/js/routes/volunteer.js',
	'/partners/:partner([\\w\\-]*)': '/js/routes/partners.js',
	'/pantry/': '/js/routes/pantry.js',
	'/pantry/distribution': '/js/routes/pantry-distribution.js',
	'/posts/:year(20\\d{2})/:month(0?\\d|[0-2])/:day(0?[1-9]|[12]\\d|3[01])/:post([a-z0-9\\-]+[a-z0-9])': '/js/routes/posts.js',
}, {
	rootEl: document.getElementById('main'),
	notFound: '/js/routes/404.js',
	observePreloads: true,
});

observeEvents(document.getElementById('main'));

document.addEventListener(NAV_EVENT, event => {
	event.waitUntil(async () => {
		if (event.reason === EVENT_TYPES.load) {
			const oldLink = document.querySelector('#nav a.active');
			const newLink = [...document.querySelectorAll('#nav a:not(.active)')].find(a => a.href === location.href);

			if (oldLink instanceof HTMLElement) {
				oldLink.inert = false;
				oldLink.tabIndex = 0;
				oldLink.classList.remove('active', 'no-pointer-events');
			}

			if (newLink instanceof HTMLElement) {
				newLink.inert = true;
				newLink.classList.add('active', 'no-pointer-events');
			}

			loadHandler();
		}
	}, { signal: AbortSignal.timeout(10_000)});
});

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

function loadHandler() {
	init();

	on('[data-navigate]', 'click', ({ currentTarget }) => navigate(currentTarget.dataset.navigate));

	if (location.pathname.startsWith('/contact/')) {
		on('#contact-coordinates', 'click', async ({ currentTarget }) => {
			currentTarget.disabled = true;

			try {
				const { coords } = await getLocation({ enableHighAccuracy: true });

				if (typeof coords?.latitude === 'number') {
					const result = document.createElement('div');
					document.getElementById('contact-latitude').value = coords.latitude;
					document.getElementById('contact-longitude').value = coords.longitude;
					result.textContent = `Your location has been added. [${coords.latitude}, ${coords.longitude}]`;
					currentTarget.replaceWith(result);
				} else {
					throw new TypeError('Geo Coordinates are invalid.');
				}
			} catch(err) {
				reportError(err);
				currentTarget.disabled = false;
			}
		});
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
						location: {
							address: data.has('addressLocality') ? {
								streetAddress: data.get('streetAddress'),
								addressLocality: data.get('addressLocality'),
								postalCode: data.get('postalCode'),
							} : undefined,
							geo: data.has('latitude') && data.has('longitude') ? {
								latitude: parseFloat(data.get('latitude')),
								longitude: parseFloat(data.get('longitude')),
							} : undefined
						}
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
}

Promise.all([
	customElements.whenDefined('install-prompt'),
	ready(),
]).then(([HTMLInstallPromptElement]) => {
	on('#install-btn', ['click'], () => new HTMLInstallPromptElement().show())
		.forEach(el => el.hidden = false);
	loadHandler();
});
