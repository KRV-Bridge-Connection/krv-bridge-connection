import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { onSubmit, onReset, onCommand, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { COMMANDS } from '@aegisjsproject/commands/consts.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';

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

const resetHandler = registerCallback('kiosk:reset', () => document.getElementById('kiosk-id').value = `submit-${crypto.randomUUID()}`);

export const styles = css`@layer utility {
	#kiosk-container {
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

export default ({ signal }) => html`<div id="kiosk-container" class="background-primary color-default overflow-auto" data-theme="dark" ${onCommand}="${commandHandler}">
	<form id="kiosk" data-font-family="system-ui" ${signalAttr}="${signal}" ${onSubmit}="${submitHandler}"${onReset}="${resetHandler}">
		<input type="hidden" name="uuid" id="kiosk-id" value="submit-${crypto.randomUUID()}"
		<fieldset id="agencies">
			<legend>Partners</legend>
			<p>What partners may we help connect you with?</p>
			<ul class="partners-select flex row wrap" data-gap="0.8">
			<li class="partner-item">
				<label class="partner-entry btn btn-secondary">
				<input type="checkbox" name="partner" value="gbla" class="partner-check visually-hidden" />
				<span class="partner-label">GBLA</span>
				<br />
				<img src="https://krvbridge.org/img/partners/gbla.svg" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="GBLA" class="partner-logo" />
				</label>
			</li>
			<li class="partner-item">
				<label class="partner-entry btn btn-secondary">
				<input type="checkbox" name="partner" value="flood" class="partner-check visually-hidden" />
				<span class="partner-label">Flood</span>
				<br />
				<img src="https://krvbridge.org/img/partners/flood.svg" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="Flood" class="partner-logo" />
				</label>
			</li>
			<li class="partner-item">
				<label class="partner-entry btn btn-secondary">
				<input type="checkbox" name="partner" value="salvation-army" class="partner-check visually-hidden" />
				<span class="partner-label">Salvation Army</span>
				<br />
				<img src="https://krvbridge.org/img/partners/salvation-army.svg" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="Salvation Army" class="partner-logo" />
				</label>
			</li>
			<li class="partner-item">
				<label class="partner-entry btn btn-secondary">
				<input type="checkbox" name="partner" value="kite" class="partner-check visually-hidden" />
				<span class="partner-label">KITE</span>
				<br />
				<img src="https://krvbridge.org/img/partners/kite.svg" crossorigin="anonymous" referrerpolicy="no-referrer" width="64" alt="KITE" class="partner-logo" />
				</label>
			</li>
			</ul>
		</fieldset>
		<fieldset id="contact">
			<legend>Contact Info</legend>
			<div class="form-group">
			<label for="contact-name" class="input-label required">Name</label>
			<input type="text" name="contact[name]" id="contact-name" class="input" placeholder="First Last" autocomplete="off" required="" />
			</div>
			<div class="form-group">
			<label for="contact-phone" class="input-label required">Phone</label>
			<input type="tel" name="contact[phone]" id="contact-phone" class="input" placeholder="+1-555-555-5555" autocomplete="off" required="" />
			</div>
			<div class="form-group">
			<label for="contact-email" class="input-label">Email</label>
			<input type="email" name="contact[email]" id="contact-email" class="input" placeholder="user@example.com" autocomplete="off" />
			</div>
		</fieldset>
		<div class="flex row" data-gap="0.8">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Cancel</button>
		</div>
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

export const title = 'KRV Bridge Connection kiosk';

export const description = 'A self-help kiosk for the KRV Bridge Connection';
