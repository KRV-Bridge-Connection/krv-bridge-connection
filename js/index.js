import { debounce } from '@shgysk8zer0/kazoo/events.js';
import { EVENT_TYPES, NAV_EVENT, init as initRouter } from '@aegisjsproject/router';
import { observeEvents } from '@aegisjsproject/callback-registry/events.js';
import { registerRootCommand, initRootCommands } from '@aegisjsproject/commands';
import '@shgysk8zer0/components/share-button.js';
import '@shgysk8zer0/components/weather/current.js';
import '@kernvalley/components/events.js';
import '@shgysk8zer0/components/github/user.js';
import '@shgysk8zer0/components/notification/html-notification.js';
import '@shgysk8zer0/components/install/prompt.js';
import '@shgysk8zer0/components/app/stores.js';
import '@shgysk8zer0/components/scroll-snap.js';
import '@shgysk8zer0/components/youtube/player.js';
import { registerServiceWorker } from '@aegisjsproject/hermes/registry.js';

try {
	const hermes = trustedTypes.createPolicy('hermes#script-url', {
		createScriptURL(input) {
			const url = URL.parse(input, document.baseURI);
			if (url?.origin === location.origin) {
				return url.href;
			} else {
				throw new TypeError(`Invalid script URL: "${input}".`);
			}
		}
	});

	registerServiceWorker(hermes.createScriptURL('/worker.js'));
} catch(err) {
	console.error(err);
}

initRouter(document.scripts.namedItem('aegis-routes'), {
	rootEl: document.getElementById('main'),
	notFound: '/js/routes/404.js',
	observePreloads: true,
});

observeEvents(document.getElementById('main'));
initRootCommands();

if (! CSS.supports('height', '1dvh')) {
	document.documentElement.style.setProperty('--viewport-height', `${globalThis.innerHeight}px`);

	requestIdleCallback(() => {
		window.addEventListener('resize', debounce(() => {
			document.documentElement.style.setProperty('--viewport-height', `${globalThis.innerHeight}px`);
		}), { passive: true });
	});
}

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
	customElements.whenDefined('install-prompt'),
]).then(([HTMLInstallPromptElement]) => {
	const btn = document.getElementById('install-btn');
	registerRootCommand('--install', () => new HTMLInstallPromptElement().show());
	btn.command = '--install';
	btn.commandForElement = document.documentElement;
	btn.hidden = false;
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
