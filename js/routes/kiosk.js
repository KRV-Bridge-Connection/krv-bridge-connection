import { css } from '@aegisjsproject/core/parsers/css.js';
import { onClick, onSubmit, onChange, onReset, onCommand, onToggle, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { COMMANDS } from '@aegisjsproject/commands/consts.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { getAllItems, openDB } from '@aegisjsproject/idb';
import { $state, $html, $text } from '@aegisjsproject/iota';
import { syncPartners } from './partners.js';
import { SCHEMA } from '../consts.js';

export const STORE_NAME = 'partners';

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

const submitHandler = registerCallback('kiosk:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		const data = new FormData(target);

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
	currentTarget.elements.namedItem('partners[]').checked = selected;
});

const toggleHandler = registerCallback('kiosk:popover-toggle', ({ target, newState }) => {
	if (newState === 'open') {
		document.querySelectorAll(':popover-open').forEach(popover => {
			if (! popover.isSameNode(target)) {
				popover.hidePopover();
			}
		});
	}
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

export default async ({ signal }) => {
	await syncPartners({ signal });
	using stack = new DisposableStack();
	const db = await await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA, stack, signal });
	const results = await getAllItems(db, STORE_NAME, null, { signal });
	const $label = $text(() => $wakelock.get() instanceof WakeLockSentinel ? 'Revoke Lock' : 'Start Wakelock');

	return $html`<div id="kiosk-container" class="background-primary color-default overflow-auto" data-theme="dark" ${onCommand}="${commandHandler}">
		<div class="center">
			<button type="button" class="btn btn-primary btn-lg" command="show-popover" commandfor="kiosk-services">Get Started</button>
		</div>
		<form action="/api/kiosk" method="post" id="kiosk" data-font-family="system-ui" ${signalAttr}="${signal}" ${onSubmit}="${submitHandler}"${onReset}="${resetHandler}">
			<input type="hidden" name="uuid" id="kiosk-id" value="submit-${crypto.randomUUID()}" />
			<section id="kiosk-services" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<div class="flex row wrap">
					${results.filter(({ partner, keywords }) => partner === true && Array.isArray(keywords) && keywords.length !== 0).map(({ id, name, keywords = [], image = {}}) => `<fieldset class="card" ${onChange}="${changeHandler}" ${signalAttr}="${signal}">
						<legend class="partner-heading">${name}</legend>
						<img src="${image.url ?? image.src}" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="${name}" class="partner-logo" />
						<h4>Services &amp; Programs</h4>
						<input type="checkbox" class="parnter-selected" name="partners[]" value="${id}" hidden="" readonly="" />
						${keywords.map(keyword => `<label><span>${keyword}</span><input type="checkbox" class="partner-service" name="services[]" value="${id}[${keyword}]" /></label>`).join('')}
					</fieldset>`).join('\n')}
				</div>
				<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-contact">
					<span>Next</span>
					${NEXT}
				</button>
				<button type="reset" class="btn btn-danger">
					<span>Cancel</span>
					${X}
				</button>
			</section>
			<fieldset id="kiosk-contact" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<legend>Contact Info</legend>
				<div class="form-group">
					<label for="contact-name" class="input-label required">Name</label>
					<input type="text" name="contact[name]" id="contact-name" class="input" placeholder="First Last" autocomplete="off" required="" />
				</div>
				<div class="form-group">
					<label for="contact-phone" class="input-label">Phone</label>
					<input type="tel" name="contact[phone]" id="contact-phone" class="input" placeholder="+1-555-555-5555" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="contact-age" class="input-label required">Age</label>
					<input type="number" id="contact-age" class="input" name="contact[age]" placeholder="##" autocomplete="off" required="" />
				</div>
				<div class="form-group">
					<label for="contact-email" class="input-label">Email</label>
					<input type="email" name="contact[email]" id="contact-email" class="input" placeholder="user@example.com" autocomplete="off" />
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
	<details>
		<summary>Kiosk Controls</summary>
		<button type="button" class="btn btn-secondary" command="${COMMANDS.requestFullscreen}" commandfor="kiosk-container">
			<span>Fullscreen</span>
			${FULLSCREEN}
		</button>
		<button type="button" ${onClick}="${toggleWakeLock}" class="btn btn-secondary" ${signalAttr}="${signal}">${$label}</button>
	</details>`;
};

export const title = 'KRV Bridge Connection kiosk';

export const description = 'A self-help kiosk for the KRV Bridge Connection';

export const styles = css`@layer utility {
	#kiosk-container {
		& :popover-open {
			max-height: 95vh;
			overflow: auto;
		}

		#kiosk-services {
			padding: 2rem;
			max-width: 1200px;
			margin: 0 auto;
			text-align: center;
		}

		#kiosk-services .flex.row.wrap {
			gap: 2rem;
			justify-content: center;
			margin-bottom: 2.5rem;
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
	}
}`;
