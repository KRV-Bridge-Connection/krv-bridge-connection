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

// Mock GAS
window.google = window.google || {};
window.google.script = window.google.script || {};

globalThis.volunteerClockIn = function volunteerClockIn(data) {
	console.log(data);

	return { success: true, message: 'Volunteer clocked in' };
};

globalThis.volunteerClockIn = function volunteerClockOut(data) {
	console.log(data);

	return { success: true, message: 'Volunteer clocked out' };
};

globalThis.employeeClockIn = function employeeClockIn(data) {
	console.log(data);

	return { success: true, message: 'Employee clocked in' };
};

globalThis.employeeClockOut = function employeeClockOut(data) {
	console.log(data);

	return { success: true, message: 'Employee clocked out' };
};

globalThis.submitClientCheckIn = function submitClientCheckIn(data) {
	console.log(data);

	return { success: true, message: 'Client checked in' };
};

globalThis.submitKioskReferral = function submitKioskReferral(data) {
	console.log(data);

	return { success: true, message: 'Referral sent.' };
};

globalThis.submitVolunteerInterest = function submitVolunteerInterest(data) {
	console.log(data);

	return { success: true, message: 'Thank you for your interest in volunteering.' };
};

globalThis.submitFeedback = function submitFeedback(data) {
	console.log(data);

	return { success: true, message: 'Thank you for the feedback.' };
};

class ContentServiceRequestEvent extends Event {
	#data;

	constructor(data) {
		super('request');
		this.#data = JSON.stringify(data);
	}

	get postData() {
		return { contents: this.#data };
	}
}

class ContentService {
	payload = null;
	mimeType = 'text/plain';

	static MimeType = {
		JSON: 'application/json',
	};

	constructor(payload) {
		this.payload = payload;
	}

	setMimeType(mimeType) {
		this.mimeType = mimeType;
		return this;
	}

	static createTextOutput(text) {
		return new this(text);
	}
}

// GAS Backend Code
function doPost(e) {
	try {
		const { scriptAction, ...data } = JSON.parse(e.postData.contents);

		if (typeof globalThis[scriptAction] === 'function') {
			const result = globalThis[scriptAction](data);

			return ContentService.createTextOutput(JSON.stringify({ success: true, data: result, message: result?.message }))
				.setMimeType(ContentService.MimeType.JSON);
		} else {
			return ContentService.createTextOutput(JSON.stringify({ success: false, error: `Function ${scriptAction} not found` }))
				.setMimeType(ContentService.MimeType.JSON);
		}
	} catch (err) {
		return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
			.setMimeType(ContentService.MimeType.JSON);
	}
}

// Mock the google.script.run API
window.google.script.run = new Proxy({
	_successHandler: null,
	_failureHandler: null,
	_userObject: null,

	withSuccessHandler(callback) {
		this._successHandler = callback;
		return window.google.script.run; // Return the Proxy to allow chaining
	},

	withFailureHandler(callback) {
		this._failureHandler = callback;
		return window.google.script.run;
	},

	withUserObject(obj) {
		this._userObject = obj;
		return window.google.script.run;
	}
}, {
	get(target, prop) {
		// Return native builder methods if requested
		if (prop in target) {
			return target[prop];
		}

		return function(...args) {
			console.info(`[Mock GAS] 📡 Request sent to backend function: ${String(prop)}`, args);

			// Simulate network latency (800ms)
			args[0].scriptAction = prop;
			setTimeout(() => {
				const event = new ContentServiceRequestEvent(args[0]);
				const result = doPost(event);
				const { success, message, error } = JSON.parse(result.payload);

				if (success) {
					const mockResponse = {
						success,
						message,
						timestamp: new Date().toISOString(),
						echo: args[0] // Returns the submitted data so you can inspect it in your UI
					};

					if (target._successHandler) {
						target._successHandler(mockResponse, target._userObject);
					}
				} else {
					if (target._failureHandler) {
						target._failureHandler(new Error(`[Mock GAS] Simulated server error in ${String(prop)}`, { cause: error }), target._userObject);
					}
				}

				// GAS resets handlers after execution
				target._successHandler = null;
				target._failureHandler = null;
				target._userObject = null;
			}, 800);
		};
	}
});

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
	await navigator.serviceWorker.register(policy.createScriptURL(document.documentElement.dataset.serviceWorker), {
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

function expandFormToObject(form, submitter) {
	const formData = new FormData(form, submitter);
	const els = form.elements;
	const data = {};

	for (const key of new Set(formData.keys())) {
		const values = formData.getAll(key);
		const elements = els.namedItem(key);
		const isList = elements instanceof RadioNodeList || elements instanceof NodeList || elements instanceof HTMLCollection;
		const el = isList ? elements[0] : elements;
		const isCheckbox = el?.type === 'checkbox';
		const isMultipleSelectOrFile = el?.multiple;
		const hasArrayBrackets = key.endsWith('[]');

		if ((isCheckbox && isList) || isMultipleSelectOrFile || hasArrayBrackets || values.length > 1) {
			data[key] = values;
		} else if (el instanceof HTMLInputElement && el.type === 'number') {
			data[key] = el.valueAsNumber;
		} else if (el?.type === 'datetime' || el?.type === 'datetime-locale') {
			data[key] = el.valueAsDate.toIsoString();
		} else if (isCheckbox && ! el?.hasAttribute?.('value')) {
			data[key] = el.checked;
		} else {
			data[key] = values[0];
		}
	}

  	return data;
}

async function runAsync(scriptAction, payload) {
	const { resolve, reject, promise } = Promise.withResolvers();
	globalThis.google.script.run
		.withSuccessHandler(resolve)
		.withFailureHandler(reject)[scriptAction](payload);

	return await promise;
}

document.documentElement.addEventListener('submit', async event => {
	event.preventDefault();
	const { target, submitter = document.createElement('button') } = event;
	const { resolve, reject, promise } = Promise.withResolvers();
	const stack = new DisposableStack();
	const controller = stack.adopt(new AbortController(), controller => controller.abort());

	try {
		const { scriptAction = 'scriptAction', ...data } = expandFormToObject(target, submitter);
		const results = document.getElementById('results');

		submitter.disabled = true;

		const resp = await runAsync(submitter?.name === 'scriptAction' ? submitter.value : scriptAction, data);

		document.getElementById('result-data').textContent = resp.success
			? resp.message
			: resp.error;

		results.addEventListener('toggle', ({ newState, target }) => {
			if (newState === 'closed') {
				resolve();
				controller.abort();
				event.target.reset();
				event.target.hidePopover();
			} else {
				scheduler.postTask(() => target.hidePopover(), { signal: controller.signal, delay: 3000 });
			}
		}, { signal: controller.signal });

		results.showPopover();
  	} catch (err) {
		reject(err);
		controller.abort(err);
		console.error(err);
	} finally {
		await promise;
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
