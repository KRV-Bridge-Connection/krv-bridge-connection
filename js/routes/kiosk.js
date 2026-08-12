import { css } from '@aegisjsproject/core/parsers/css.js';
import { onClick, onSubmit, onChange, onReset, onCommand, onToggle, onInvalid, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { COMMANDS } from '@aegisjsproject/commands/consts.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { getAllItems, openDB } from '@aegisjsproject/idb';
import { $state, $html, $text } from '@aegisjsproject/iota';
import { syncPartners } from './partners.js';
import { SCHEMA } from '../consts.js';

export const STORE_NAME = 'partners';
const GCalElement = customElements.get('g-cal-events');
const KRVEvents = customElements.get('krv-events');

const $wakelock = $state(null);

const NEXT = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="16" height="16" viewBox="0 0 16 16" role="presentation" aria-hidden="true">
    <path d="M11.44 8l-5.719 5.719a1.01 1.01 0 0 1-.719.281h-1v-1c0-.256.086-.523.282-.719l4.28-4.28-4.28-4.282A1.01 1.01 0 0 1 4.002 3V2h1c.256 0 .523.086.72.281z"/>
</svg>`;

const PREV = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="16" height="16" viewBox="0 0 16 16" role="presentation" aria-hidden="true">
    <path d="M4.56 8l5.719 5.719c.196.196.463.281.719.281h1v-1a1.01 1.01 0 0 0-.282-.719l-4.28-4.28 4.28-4.282A1.01 1.01 0 0 0 11.998 3V2h-1a1.01 1.01 0 0 0-.72.281z"/>
</svg>`;

const CHECK = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
</svg>`;

const X = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
</svg>`;

const FULLSCREEN = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="14" height="16" viewBox="0 0 14 16" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M13 10h1v3c0 .547-.453 1-1 1h-3v-1h3v-3zM1 10H0v3c0 .547.453 1 1 1h3v-1H1v-3zm0-7h3V2H1c-.547 0-1 .453-1 1v3h1V3zm1 1h10v8H2V4zm2 6h6V6H4v4zm6-8v1h3v3h1V3c0-.547-.453-1-1-1h-3z"/>
</svg>`;

const START = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="16" height="16" viewBox="0 0 16 16" role="presentation" aria-hidden="true">
	<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM6.79 5.093A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z"/>
</svg>`;

const HELP = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="16" height="16" viewBox="0 0 16 16" role="presentation" aria-hidden="true">
	<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.617.592-2.776 2.222a.25.25 0 0 0 .256.261zm1.385 4.908a.903.903 0 1 0 0-1.806.903.903 0 0 0 0 1.806z"/>
</svg>`;

const FOOD = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="16" height="16" viewBox="0 0 483.297 483.298" role="presentation" aria-hidden="true">
	<g>
		<g>
			<path d="M77.273,150.705c-21.494,20.822-33.567,46.752-38.825,75.96c-1.313,7.296-1.778,14.745-2.646,22.124
				c-0.094,0.803-0.268,1.597-0.407,2.395c0,7.197,0,14.393,0,21.588c0.46,4.944,0.891,9.89,1.385,14.83
				c2.331,23.281,8.067,45.762,15.78,67.807c10.486,29.969,25.457,57.268,44.502,82.08c0.591,0.789,1.186,1.578,1.782,2.363
				c8.184,10.756,16.684,21.211,27.421,29.582c2.444,1.906,4.938,3.619,7.483,5.139c13.797,9.543,29.115,10.855,45.055,5.893
				c0.436-0.137,0.87-0.281,1.306-0.422c7.148-1.852,14.081-4.385,20.932-7.209c4.79-1.973,9.635-3.719,14.548-5.143
				c8.058-2.256,25.646-3.881,26.059-3.883c0.413,0,0.825-0.006,1.239,0.002c8.525,0.164,16.762,1.625,24.818,3.881
				c4.914,1.424,9.758,3.17,14.549,5.143c6.852,2.824,13.783,5.357,20.932,7.211c0.437,0.135,0.87,0.283,1.307,0.42
				c15.939,4.963,31.258,3.65,45.056-5.893c2.545-1.518,5.041-3.232,7.483-5.139c10.739-8.371,19.238-18.826,27.423-29.582
				c0.6-0.785,1.192-1.574,1.78-2.363c19.049-24.812,34.019-52.111,44.504-82.08c7.714-22.045,13.449-44.521,15.779-67.807
				c0.494-4.938,0.925-9.886,1.385-14.83c0-7.195,0-14.391,0-21.588c-0.137-0.797-0.312-1.592-0.407-2.395
				c-0.865-7.379-1.331-14.828-2.646-22.124c-5.258-29.208-17.33-55.139-38.825-75.96c-2.897-2.806-5.875-5.436-8.931-7.897
				c-16.712-14.104-36.623-21.511-58.44-25.131c-22.176-3.681-42.987,1.164-63.571,8.573c-10.595,3.813-32.914,11.537-33.435,11.687
				c-0.521-0.149-22.84-7.874-33.434-11.687c-20.586-7.409-41.395-12.254-63.572-8.573c-21.821,3.624-41.73,11.03-58.441,25.131
				C83.148,145.269,80.169,147.899,77.273,150.705z"/>
			<path d="M174.413,83.121c11.172,12.094,24.207,21.392,40.299,25.866c7.938,2.208,16.017,3.021,24.248,2.585
				c1.957-0.102,2.346-0.883,2.467-2.659c1.674-24.658-6.109-46.287-20.802-65.766c-17.44-23.129-40.703-36.752-68.887-42.401
				c-1.349-0.271-2.704-0.497-4.057-0.746c-1.146,0-2.289,0-3.434,0c-0.672,9.246-0.437,18.452,1.276,27.585
				C149.545,49.012,159.754,67.252,174.413,83.121z"/>
		</g>
	</g>
</svg>`;

const CAL = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="14" height="16" viewBox="0 0 14 16" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M13 2h-1v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H6v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H2c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm0 12H2V5h11v9zM5 3H4V1h1v2zm6 0h-1V1h1v2zM6 7H5V6h1v1zm2 0H7V6h1v1zm2 0H9V6h1v1zm2 0h-1V6h1v1zM4 9H3V8h1v1zm2 0H5V8h1v1zm2 0H7V8h1v1zm2 0H9V8h1v1zm2 0h-1V8h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1zm2 0h-1v-1h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1z"/>
</svg>`;

const LOCK = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M4 13H3v-1h1v1zm8-6v7c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h1V4c0-2.2 1.8-4 4-4s4 1.8 4 4v2h1c.55 0 1 .45 1 1zM3.8 6h4.41V4c0-1.22-.98-2.2-2.2-2.2-1.22 0-2.2.98-2.2 2.2v2H3.8zM11 7H2v7h9V7zM4 8H3v1h1V8zm0 2H3v1h1v-1z"/>
</svg>`;

const THEME = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="presentation" aria-hidden="true">
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor" />
</svg>`;

const REFRESH = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="presentation" aria-hidden="true">
  <polyline points="17 1 21 5 17 9" />
  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
  <polyline points="7 23 3 19 7 15" />
  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
</svg>`;

const submitHandler = registerCallback('kiosk:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		const data = new FormData(target);

		if (! data.has('services[]')) {
			const fieldset = document.getElementById('kiosk-services');
			fieldset.showPopover();
			alert('Please select one or more services.');
			fieldset.firstElementChild.scrollIntoView({ behavior: 'instant', block: 'start' });
			return;
		}

		if (submitter instanceof HTMLButtonElement) {
			submitter.disabled = true;
		}

		const resp = await fetch('/api/kiosk', {
			method: 'POST',
			body: data,
		});

		if (resp.ok) {
			const { resolve, promise } = Promise.withResolvers();
			const controller = new AbortController();
			const popover = document.getElementById('kiosk-success');
			popover.addEventListener('toggle', ({ newState }) => {
				if (newState === 'closed') {
					resolve();
					controller.abort();
				}
			}, { signal: controller.signal });
			popover.showPopover();

			await promise;
			target.reset();
		} else {
			throw new DOMException(`${resp.url} [${resp.status}]`, 'NetworkError');
		}

	} catch(err) {
		reportError(err);
		const { resolve, promise } = Promise.withResolvers();
		const controller = new AbortController();
		const popover = document.getElementById('kiosk-error');
		popover.querySelector('.status-box').textContent = err.message;
		popover.addEventListener('toggle', ({ newState }) => {
			if (newState === 'closed') {
				resolve();
				controller.abort();
			}
		}, { signal: controller.signal });

		popover.showPopover();
		await promise;
	} finally {
		if (submitter instanceof HTMLButtonElement) {
			submitter.disabled = false;
		}
	}
});

const commandHandler = registerCallback('kiosk-container:command', event => {
	switch(event.command) {
		case COMMANDS.requestFullscreen:
			event.target.requestFullscreen();
			break;
	}
});

const resetHandler = registerCallback('kiosk:reset', () => {
	document.getElementById('kiosk-id').value = `submit-${crypto.randomUUID()}`;
	document.querySelectorAll(':popover-open').forEach(popover => popover.hidePopover());
});

const changeHandler = registerCallback('kiosk:change', ({ currentTarget }) => {
	const selected = currentTarget.querySelector('[name="services[]"]:checked') instanceof HTMLElement;
	currentTarget.querySelector('[name="partners[]"]').checked = selected;
});

const toggleHandler = registerCallback('kiosk:popover-toggle', ({ target, newState }) => {
	if (newState === 'open') {
		document.querySelectorAll(':popover-open').forEach(popover => {
			if (! popover.isSameNode(target)) {
				popover.hidePopover();
			}
		});

		target.firstElementChild.scrollIntoView({ behavior: 'instant', block: 'start' });
	}
});

const invalidHandler = registerCallback('kiosk:invalid', ({ currentTarget }) => {
	const invalid = currentTarget.querySelector(':invalid');
	const fieldset = invalid.closest('fieldset');
	fieldset.showPopover();
	invalid.focus();
});

const toggleWakeLock = registerCallback('kiosk:toggle-wakelock', async ({ currentTarget }) => {
	if ('wakeLock' in navigator) {
		const current = $wakelock.get();

		if (current instanceof WakeLockSentinel) {
			current.release();
			$wakelock.set(null);
		} else {
			try {
				const lock = await navigator.wakeLock.request('screen');
				lock.addEventListener('release', () => $wakelock.set(null), { once: true });
				$wakelock.set(lock);
			} catch(err) {
				reportError(err);
				$wakelock.set(null);
			}
		}
	} else {
		currentTarget.disabled = true;
	}
});

const refresh = registerCallback('kiosk:refresh', async ({ currentTarget }) => {
	currentTarget.disabled = true;

	try {
		await cookieStore.set({
			name: '_lastSync_partners',
			value: new Date(Date.now() - 86400001).getTime(), // Now minus 24 hours and one second
			path: '/',
			sameSite: 'strict',
			secure: true,
			partitioned: true,
			expires: new Date(Date.now() + 15724800000),
		});

		await syncPartners();
		location.reload();
	} catch(err) {
		reportError(err);
	} finally {
		currentTarget.disabled = false;
	}
});

const toggleTheme = registerCallback('kiosk:toggle-theme', () => {
	switch(document.documentElement.dataset.theme) {
		case 'dark':
			document.documentElement.dataset.theme = 'light';
			break;

		case 'light':
			document.documentElement.dataset.theme = 'auto';
			break;

		default:
			document.documentElement.dataset.theme = 'dark';
	}
});

export default async ({ signal, stack }) => {
	await syncPartners({ signal }).catch(console.error);
	const db = await await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA, stack, signal });
	const results = await getAllItems(db, STORE_NAME, null, { signal });
	const $label = $text(() => $wakelock.get() instanceof WakeLockSentinel ? 'Revoke Lock' : 'Start Wakelock');

	const frag = $html`<div id="kiosk-container" class="background-primary color-default overflow-auto" ${onCommand}="${commandHandler}">
		<header class="kiosk-welcome-instructions">
			<h1 class="center">
				<div class="center">Welcome to the KRV Bridge Connection</div>
				<img src="/img/branding/krv-bridge-logo-wide.svg" class="block" referrerpolicy="no-referrer" decoding="async" />
			</h1>
			<p>Use this self-service kiosk to connect with local community resources and partners.</p>
		</header>
		<section id="kiosk-help" class="instruction-steps" popover="auto">
			<h2>How it works:</h2>
			<ol>
				<li><strong>Select Services:</strong> Choose the specific programs or partners you need assistance from.</li>
				<li><strong>Provide Contact Info:</strong> Enter your basic details so the partners can reach you.</li>
				<li><strong>Submit:</strong> Securely send your information to your chosen providers.</li>
			</ol>
			<p class="call-to-action"><strong>Tap <q>Get Started</q> below to begin.</strong></p>
			<button type="button" class="btn btn-danger" command="hide-popover" commandfor="kiosk-help">
				<span>Dismiss</span>
				${X}
			</button>
		</section>
		<menu class="flex row wrap space-around kiosk-menu">
			<button type="button" class="btn btn-primary btn-lg" command="show-popover" commandfor="kiosk-services">
				<span>Get Started</span>
				${START}
			</button>
			<button type="button" class="btn btn-secondary btn-lg" command="show-popover" commandfor="kiosk-help">
				<span>Need Help?</span>
				${HELP}
			</button>
			<br class="full-width" />
			<button type="button" class="btn btn-secondary btn-lg" command="show-popover" commandfor="kiosk-pantry-cal">
				<span>Pantry Schedule</span>
				${FOOD}
			</button>
			<button type="button" class="btn btn-secondary btn-lg" command="show-popover" commandfor="kiosk-events-cal">
				<span>View Events</span>
				${CAL}
			</button>
			<button type="button" class="btn btn-secondary btn-lg" command="show-popover" commandfor="kiosk-partner-cal">
				<span>View Partner Schedule</span>
				${CAL}
			</button>
		</menu>
		<form action="/api/kiosk" method="post" id="kiosk" data-font-family="system-ui" ${signalAttr}="${signal}" ${onSubmit}="${submitHandler}"${onReset}="${resetHandler}" ${onInvalid}="${invalidHandler}">
			<input type="hidden" name="uuid" id="kiosk-id" value="submit-${crypto.randomUUID()}" />
			<fieldset id="kiosk-services" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<legend>Partners &amp; Services</legend>
				<p>Please select all of the services that you are seeking today.</p>
				<div class="flex row wrap">
					${results.filter(({ partner, programs }) => partner === true && Array.isArray(programs) && programs.length !== 0).map(({ id, name, programs = [], image = {}, description}) => `<div class="card" ${onChange}="${changeHandler}" ${signalAttr}="${signal}">
						<h3 class="partner-heading visually-hidden">${name}</h3>
						<img src="${image.url ?? image.src}" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="${name}" class="partner-logo" />
						<p>${description}</p>
						<h4>Services &amp; Programs</h4>
						<input type="checkbox" class="parnter-selected" name="partners[]" value="${id}" hidden="" readonly="" />
						${programs.map(program => `<label><span>${program}</span><input type="checkbox" class="partner-service" name="services[]" value="${program}" /></label>`).join('')}
					</div>`).join('\n')}
				</div>
				<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-contact">
					<span>Next</span>
					${NEXT}
				</button>
				<button type="reset" class="btn btn-danger">
					<span>Cancel</span>
					${X}
				</button>
			</fieldset>
			<fieldset id="kiosk-contact" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<legend>Contact Info</legend>
				<p>Only inputs with a <q>*</q> are required. Please provide contact info if you wish for our partners to contact you regarding your request.</p>
				<div class="form-group">
					<label for="contact-name" class="input-label required">Name</label>
					<input type="text" name="contact[name]" id="contact-name" class="input" placeholder="First Last" autocapitalize="words" autocomplete="off" autofocus="" required="" />
				</div>
				<div class="form-group">
					<label for="contact-size" class="input-label required">How Many Individuals will be Receiving Services?</label>
					<input type="number" name="size" id="contact-size" class="input" value="1" min="1" max="14" placeholder="##" autocomplete="off" required="" />
				</div>
				<div class="form-group">
					<label for="contact-phone" class="input-label">Phone</label>
					<input type="tel" name="contact[phone]" id="contact-phone" class="input" placeholder="+1-555-555-5555" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="contact-email" class="input-label">Email</label>
					<input type="email" name="contact[email]" id="contact-email" class="input" placeholder="user@example.com" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="contact-age" class="input-label">Age</label>
					<input type="number" id="contact-age" class="input" name="contact[age]" placeholder="##" autocomplete="off" />
				</div>
				<div class="flex row" data-gap="0.8">
					<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-services">
						<span>Back</span>
						${PREV}
					</button>
					<button type="button" class="btn btn-secondary"command="show-popover" commandfor="kiosk-message">
						<span>Next</span>
						${NEXT}
					</button>
					<button type="reset" class="btn btn-danger">
						<span>Cancel</span>
						${X}
					</button>
				</div>
			</fieldset>
			<fieldset id="kiosk-message" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<legend>Additional Comments?</legend>
				<p>Please do not share any sensitive information.</p>
				<div class="form-group">
					<label for="kiosk-message-text" class="input-label">Message/Comment</label>
					<textarea name="message" id="kiosk-message-text" class="input" placeholder="Add an additional comment or message"></textarea>
				</div>
				<div class="flex row" data-gap="0.8">
					<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-contact">
						<span>Back</span>
						${PREV}
					</button>
					<button type="submit" class="btn btn-success">
						<span>Submit</span>
						${CHECK}
					</button>
					<button type="reset" class="btn btn-danger">
						<span>Cancel</span>
						${X}
					</button>
				</div>
			</fieldset>
		</form>
		<div id="kiosk-success" popover="auto">
			<p>Your information will be shared with the selected partners.</p>
			<button type="button" class="btn btn-danger" command="hide-popover" commandfor="kiosk-success">
				<span>Dismiss</span>
				${X}
			</button>
		</div>
		<div id="kiosk-error" popover="auto">
			<div id="kiosk-error-message" class="status-box error"></div>
			<button type="button" class="btn btn-danger" command="hide-popover" commandfor="kiosk-error">
				<span>Dismiss</span>
				${X}
			</button>
		</div>
	</div>
	<br />
	<details class="accordion" open="">
		<summary>Kiosk Controls</summary>
		<menu class="block">
			<button type="button" class="btn btn-secondary" command="${COMMANDS.requestFullscreen}" commandfor="kiosk-container">
				<span>Fullscreen</span>
				${FULLSCREEN}
			</button>
			<button type="button" ${onClick}="${toggleWakeLock}" class="btn btn-secondary" ${signalAttr}="${signal}">
				<span>${$label}</span>
				${LOCK}
			</button>
			<button type="button" class="btn btn-warning" ${onClick}="${refresh}" ${signalAttr}="${signal}">
				<span>Refresh</span>
				${REFRESH}
			</button>
			<button type="button" class="btn btn-secondary" ${onClick}="${toggleTheme}" ${signalAttr}="${signal}">
				<span>Toggle Theme</span>
				${THEME}
			</button>
		</menu>
	</details>`;

	const pantry = GCalElement.create('pantry', { loading: 'lazy' });
	const parterCal = GCalElement.create('partners', { loading: 'lazy' });
	const events = new KRVEvents();
	events.tag = ['krv-bridge'];
	pantry.id = 'kiosk-pantry-cal';
	pantry.popover = 'auto';
	events.id = 'kiosk-events-cal';
	events.popover = 'auto';
	parterCal.id = 'kiosk-partner-cal';
	parterCal.popover = 'auto';
	frag.getElementById('kiosk-container').append(pantry, events, parterCal);

	// Needs to be `capture: true`
	frag.getElementById('kiosk').addEventListener('invalid', ({ target }) => {
		if (target instanceof HTMLInputElement) {
			const fieldset = target.closest('fieldset');

			if (fieldset instanceof HTMLFieldSetElement && ! fieldset.matches(':popover-open')) {
				fieldset.showPopover();
				target.focus();
			}
		}
	}, { capture: true, signal });

	return frag;
};

export const title = 'KRV Bridge Connection kiosk';

export const description = 'A self-help kiosk for the KRV Bridge Connection';

export const styles = css`@layer utility {
	#kiosk-container {
		[popover]:not(:popover-open) {
			display: none;
		}

		& :popover-open {
			margin-block-start: 2.5vh;
			width: min(95vw, 1200px);
			border-radius: 6px;
			padding: 2em;
			border-style: none;
			max-height: 95vh;
			overflow: auto;
		}

		#kiosk-services {
			padding: 2rem;
			text-align: center;
		}

		#kiosk-services .flex.row.wrap {
			gap: 2rem;
			justify-content: center;
			margin-bottom: 2.5rem;
		}

		.flex > br {
			flex: 1 0 100%;
			display: block;
			width: 100%;
			content: "";
			margin: 0;
		}

		.kiosk-menu {
			gap: 0.8em;
		}

		.card {
			border-radius: 16px;
			padding: 1.5rem 1.5rem 2rem;
			border: 2px solid;
			flex: 1 1 320px;
			max-width: 450px;
			display: flex;
			flex-direction: column;
			align-items: center;
			box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
		}

		.partner-heading {
			font-size: 1.5rem;
			font-weight: 700;
			padding: 0 0.75rem;
		}

		.partner-logo {
			border-radius: 4px;
			margin-bottom: 1rem;
			object-fit: contain;
			width: 300px;
			height: auto;
			padding: 0.2em;
			background-color: #dadada;
		}

		.card h4 {
			margin: 1rem 0;
			font-size: 1.25rem;
			width: 100%;
			text-align: left;
		}

		.card label {
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			padding: 1.25rem;
			margin-bottom: 0.75rem;
			border: 1px solid;
			border-radius: 8px;
			font-size: 1.2rem;
			cursor: pointer;
			box-sizing: border-box;
		}

		.card label:active {
			transform: scale(0.98);
		}

		.card input[type="checkbox"] {
			width: 1.75rem;
			height: 1.75rem;
			margin-left: 1rem;
			cursor: pointer;
		}

		& .partner-item {
			list-style: none;
		}

		.visually-hidden {
			clip-path: inset(100%);
			position: absolute;
			overflow: hidden;
		}

		.partner-entry {
			width: 240px;
			height: 100%;
			vertical-align: middle;
			transition: background-color 300ms linear;

			&:has(input:checked) {
				background-color: var(--aegis-btn-success, green);
			}

			&:has(input:focus-visible) {
				outline: 2px solid currentColor;
			}
		}

		.kiosk-welcome-instructions {
			padding: 1rem;
		}

		.kiosk-welcome-instructions h1 {
			font-size: 2rem;
			margin-bottom: 0.5rem;
		}

		.instruction-steps {
			text-align: left;
			padding: 1.5rem 2rem;
			border-radius: 12px;
		}

		.instruction-steps ol {
			line-height: 1.8;
			font-size: 1.2rem;
			margin: 0;
		}

		.call-to-action {
			font-size: 1.25rem;
			margin-bottom: 1.5rem;
		}
	}
}`;
