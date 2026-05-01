import { EVENT_TYPES, NAV_EVENT, init as initRouter } from '@aegisjsproject/router';
import { observeEvents } from '@aegisjsproject/callback-registry/events.js';
import { registerRootCommand, initRootCommands } from '@aegisjsproject/commands';
import { createPolicy } from '@shgysk8zer0/kazoo/trust.js';
import '@shgysk8zer0/components/weather/current.js';
import '@kernvalley/components/events.js';
import '@shgysk8zer0/components/github/user.js';
import '@shgysk8zer0/components/notification/html-notification.js';
import '@aegisjsproject/pwa-prompt';
import '@shgysk8zer0/components/scroll-snap.js';
import '@shgysk8zer0/components/youtube/player.js';
import '@aegisjsproject/button/share.js';

initRouter(document.scripts.namedItem('aegis-routes'), {
	rootEl: document.getElementById('main'),
	notFound: '/js/routes/404.js',
	observePreloads: true,
});

observeEvents(document.getElementById('main'));
initRootCommands();

document.documentElement.classList.add('js');
document.documentElement.classList.remove('no-js');

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
		}
	});
});

Promise.all([
	fetch('/firebase.json', { referrerPolicy: 'origin', headers: { Accept: 'application/json' } })
		.then(resp => resp.json()),
	import('@aegisjsproject/firebase-account-routes/auth.js'),
]).then(([config, { initializeFirebaseApp, logout }]) => {
	initializeFirebaseApp(config);

	registerRootCommand('--logout', async ({ source }) => {
		if (source instanceof HTMLButtonElement) {
			source.disabled = true;
		}

		fetch('/api/logout').then(resp => {
			if (resp.ok) {
				localStorage.setItem('token:expires', 0);
			}
		});

		logout();
	});
}).catch(reportError);

const policy = createPolicy('sw#script-url', {
	createScriptURL(input) {
		const url = new URL(input, document.baseURI);

		if (url.origin === location.origin) {
			return url.href;
		} else {
			throw new TypeError(`${input} is not an allowed script URL.`);
		}
	}
});

if (typeof navigator.serviceWorker?.register === 'function') {
	navigator.serviceWorker.register(policy.createScriptURL(document.documentElement.dataset.serviceWorker), {
		type: 'module',
	});

	Promise.all([
		navigator.serviceWorker.ready,
		customElements.whenDefined('html-notification')
	]).then(async ([reg, HTMLNotificationElement]) => {
		reg.addEventListener('updatefound', async ({ target }) => {
			target.update();

			// const HTMLNotificationElement = await customElements.whenDefined('html-notification');
			const notification = new HTMLNotificationElement('Update available', {
				body: 'App updated in background. Would you like to reload to see updates?',
				requireInteraction: true,
				actions: [{
					title: 'Reload',
					action: 'reload',
				}, {
					title: 'Dismiss',
					action: 'dismiss',
				}]
			});

			notification.addEventListener('notificationclick', ({ target, action }) => {
				switch(action) {
					case 'dismiss':
						target.close();
						break;

					case 'reload':
						target.close();
						location.reload();
						break;
				}
			});
		});

		if ('periodicSync' in reg) {
			const status = await navigator.permissions.query({
				name: 'periodic-background-sync',
			}).catch(() => ({ state: 'denied' }));

			if (status.state === 'granted') {
				try {
					await reg.periodicSync.register('analytics-sync', {
						// Minimum interval in milliseconds (e.g., 24 hours)
						minInterval: 24 * 60 * 60 * 1000,
					});
				} catch (error) {
					console.error('Periodic sync registration failed:', error);
				}
			};
		}
	});
}

(function log() {
	const data = new FormData();
	const url = new URL(location.href);

	data.set('type', 'load');
	data.set('id', crypto.randomUUID());
	data.set('timestamp', Date.now());
	data.set('path', url.pathname);
	data.set('origin', url.origin);
	data.set('utm_source', url.searchParams.get('utm_source'));
	data.set('utm_medium', url.searchParams.get('utm_medium'));
	data.set('utm_campaign', url.searchParams.get('utm_campaign'));
	data.set('utm_term', url.searchParams.get('utm_term'));
	data.set('utm_content', url.searchParams.get('utm_content'));
	data.set('referrer', URL.parse(document.referrer)?.origin);

	if (url.searchParams.has('utm_source') || url.searchParams.has('utm_medium')) {
		url.searchParams.delete('utm_source');
		url.searchParams.delete('utm_medium');
		url.searchParams.delete('utm_campaign');
		url.searchParams.delete('utm_term');
		url.searchParams.delete('utm_content');

		history.replaceState(history.state, '', url.href);
	}

	return navigator.sendBeacon('/api/analytics', data);
})();
