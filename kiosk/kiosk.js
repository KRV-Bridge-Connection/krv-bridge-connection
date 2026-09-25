import '@shgysk8zer0/polyfills';
import '@kernvalley/components/events.js';
import '/js/components/partners.js';
import { $state, $watch } from '@aegisjsproject/iota';
import { createPolicy } from '@shgysk8zer0/kazoo/trust.js';
import layers from '@aegisjsproject/styles/css/layers.css' with { type: 'css' };
import theme from '@aegisjsproject/styles/css/theme.css' with { type: 'css' };
import palette from '@aegisjsproject/styles/css/palette.css' with { type: 'css' };
import props from '@aegisjsproject/styles/css/properties.css' with { type: 'css' };
import reset from '@aegisjsproject/styles/css/reset.css' with { type: 'css' };
import button from '@aegisjsproject/styles/css/button.css' with { type: 'css' };
import forms from '@aegisjsproject/styles/css/forms.css' with { type: 'css' };
import misc from '@aegisjsproject/styles/css/misc.css' with { type: 'css' };
import presentation from '@aegisjsproject/styles/css/presentation.css' with { type: 'css' };
import scrollbar from '@aegisjsproject/styles/css/scrollbar.css' with { type: 'css' };

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
	Promise.all([
		navigator.serviceWorker.ready,
		customElements.whenDefined('html-notification'),
		navigator.serviceWorker.register(policy.createScriptURL(document.documentElement.dataset.serviceWorker), {
			type: 'module',
		}),
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
	});
}

document.adoptedStyleSheets = [layers, palette, props, reset, theme, button, forms, misc, presentation, scrollbar];
document.documentElement.id = 'doc';
const $wakelock = $state(null);
const cache = new WeakMap();
const IDLE_TIMEOUT_MS = 60_000;

document.addEventListener('toggle', (event) => {
	const form = event.target;

	if (form?.matches?.('form[popover="manual"]')) {
		if (event.newState === 'open') {
			const controller = new AbortController();
			cache.set(form, controller);

			const resetTimer = () => {
				if (form.dataset.timeoutId) {
					clearTimeout(parseInt(form.dataset.timeoutId));
				}

				form.dataset.timeoutId = setTimeout(() => form.reset(), IDLE_TIMEOUT_MS);
			};

			document.addEventListener('input', (e) => {
				if (form.contains(e.target)) {
					resetTimer();
				}
			}, { signal: controller.signal, passive: true });

			resetTimer();
		} else if (event.newState === 'closed') {
			if (typeof form.dataset.timeoutId === 'string') {
				clearTimeout(parseInt(form.dataset.timeoutId));
				delete form.dataset.timeoutId;
			}

			if (cache.has(form)) {
				const controller = cache.get(form);
				controller.abort();
				cache.delete(form);
			}
		}
	}
}, { capture: true });

async function showMessage(message, { controller, delay = 3000 } = {}) {
	const { resolve, reject, promise } = Promise.withResolvers();

	try {
		const results = document.getElementById('results');
		document.getElementById('result-data').textContent = message;

		results.addEventListener('toggle', ({ newState, target }) => {
			if (newState === 'closed') {
				resolve();
				controller.abort();
				event.target.reset();
				event.target.hidePopover();
			} else {
				scheduler.postTask(() => target.hidePopover(), { signal: controller.signal, delay });
			}
		}, { signal: controller.signal });

		results.showPopover();
	} catch(err) {
		reject(err);
	} finally {
		await promise;
	}
}

document.documentElement.addEventListener('submit', async event => {
	event.preventDefault();
	const { target, submitter = document.createElement('button') } = event;
	const stack = new DisposableStack();
	const controller = stack.adopt(new AbortController(), controller => controller.abort());

	try {
		const body = new FormData(target, submitter);
		submitter.disabled = true;

		const resp = await fetch('/api/kiosk', {
			method: 'POST',
			signal: controller.signal,
			body,
		});

		if (! resp.ok) {
			const { error } = await resp.json();
			throw new Error(error?.message ?? 'An unknown error occured.');
		} else {
			const { message } = await resp.json();
			target.reset();
			await showMessage(message, { controller });
		}
  	} catch (err) {
		reportError(err);
		await showMessage(err.message, { controller });
		controller.abort(err);
	} finally {
		submitter.disabled = false;
	}
});

document.documentElement.addEventListener('reset', event => {
	if (event.target instanceof HTMLFormElement && event.target.hasAttribute('popover')) {
		const popover = event.target.closest('[popover]');

		if (popover instanceof HTMLElement) {
			popover.hidePopover();
		}
	}
}, {
 	 passive: true,
});


document.documentElement.addEventListener('command', async event => {
	switch(event.command) {
		case '--fullscreen':
			event.target.requestFullscreen();
			break;

		case '--toggle-theme':
			switch(document.documentElement.dataset.theme) {
				case 'light':
					document.documentElement.dataset.theme = 'dark';
					break;

				case 'dark':
					delete document.documentElement.dataset.theme;
					break;

				default:
					document.documentElement.dataset.theme = 'light';
			}
			break;

		case '--wake-lock':
			if ('wakeLock' in navigator) {
				const current = $wakelock.get();

				if (current instanceof WakeLockSentinel) {
					current.release();
					$wakelock.set(null);
				} else {
					try {
						const lock = await navigator.wakeLock.request('screen');
						lock.addEventListener('release', (e) => {
							console.log({ event: e, lock });
							$wakelock.set(null);
						}, { once: true });
						$wakelock.set(lock);
					} catch(err) {
						reportError(err);
						$wakelock.set(null);
					}
				}
			} else {
				event.source.disabled = true;
			}
			break;
	}
}, {
	capture: true,
});

const toggleLock = lock => {
	console.log(lock);
	document.getElementById('wake-lock-btn').disabled = (lock instanceof WakeLockSentinel && ! lock.released);
	$watch($wakelock, toggleLock);
};

$watch($wakelock, toggleLock);
