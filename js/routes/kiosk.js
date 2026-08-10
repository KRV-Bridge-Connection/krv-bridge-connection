import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { onSubmit, onReset, onCommand, onToggle, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { COMMANDS } from '@aegisjsproject/commands/consts.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { getAllItems, openDB } from '@aegisjsproject/idb';
import { syncPartners } from './partners.js';
import { SCHEMA } from '../consts.js';

export const STORE_NAME = 'partners';

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

const toggleHandler = registerCallback('kiosk:popover-toggle', ({ target, newState }) => {
	if (newState === 'open') {
		document.querySelectorAll(':popover-open').forEach(popover => {
			if (! popover.isSameNode(target)) {
				popover.hidePopover();
			}
		});
	}
});

export default async ({ signal }) => {
	await syncPartners({ signal });
	using stack = new DisposableStack();
	const db = await await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA, stack, signal });
	const results = await getAllItems(db, STORE_NAME, null, { signal });

	return html`<div id="kiosk-container" class="background-primary color-default overflow-auto" data-theme="dark" ${onCommand}="${commandHandler}">
		<div class="center">
			<button type="button" class="btn btn-primary btn-lg" command="show-popover" commandfor="kiosk-services">Get Started</button>
		</div>
		<form action="/api/kiosk" method="post" id="kiosk" data-font-family="system-ui" ${signalAttr}="${signal}" ${onSubmit}="${submitHandler}"${onReset}="${resetHandler}">
			<input type="hidden" name="uuid" id="kiosk-id" value="submit-${crypto.randomUUID()}" />
			<section id="kiosk-services" popover="manual" ${onToggle}="${toggleHandler}" ${signalAttr}="${signal}">
				<div class="flex row wrap">
					${results.filter(({ partner, keywords }) => partner === true && Array.isArray(keywords)).map(({ id, name, keywords = [], image = {}}) => `<fieldset class="card">
						<legend class="partner-heading">${name}</legend>
						<img src="${image.url ?? image.src}" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="${name}" class="partner-logo" />
						<h4>Services</h4>
						${keywords.map(keyword => `<label><span>${keyword}</span><input type="checkbox" name="services[]" value="${id}[${keyword}]" /></label>`).join('')}
					</fieldset>`).join('\n')}
				</div>
				<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-contact">Next</button>
				<button type="reset" class="btn btn-danger">Cancel</button>
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
					<button type="button" class="btn btn-secondary" command="show-popover" commandfor="kiosk-services">Back</button>
					<button type="submit" class="btn btn-success">Submit</button>
					<button type="reset" class="btn btn-danger">Cancel</button>
				</div>
			</fieldset>
		</form>
		<div id="kiosk-success" popover="auto">
			<p>Your information will be shared with the selected partners.</p>
			<button type="button" class="btn btn-danger" command="hide-popover" commandfor="kiosk-success">Dismiss</button>
		</div>
		<div id="kiosk-error" popover="auto">
			<div id="kiosk-error-message" class="status-box error"></div>
			<button type="button" class="btn btn-danger" command="hide-popover" commandfor="kiosk-error">Dismiss</button>
		</div>
		<button type="button" class="btn btn-secondary" command="${COMMANDS.requestFullscreen}" commandfor="kiosk-container">Fullscreen</button>
	</div>`;
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
