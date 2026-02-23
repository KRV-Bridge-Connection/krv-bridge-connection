import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, onReset, onBlur, onBeforetoggle, signal as signalAttr, getSignal } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';
import { createBarcodeScanner, preloadRxing, CODE_128 } from '@aegisjsproject/barcodescanner';
import { Signal } from '@shgysk8zer0/signals';

const OASIS_ID_PATTERN = /^\{\[(?<type>[A-Z])\](?<id>\d{6,13})\}$/;
const PATTERN_STR = OASIS_ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const OASIS_ORIGIN = 'https://capkfoodbank.oasisinsight.net/';
const OASIS_NAME = 'Oasis';
const OASIS_SEARCH_ID = 'oasis-search-form';
const ERROR_DURATION = 5_000;
const SCANNER_ID = '_' + crypto.randomUUID();
const resetHandler = registerCallback('oasis:reset', ({ target }) => target.elements.namedItem(NAME).focus());
const submitOnBlur = registerCallback('oasis:blur', ({ target }) => target.validity.valid && target.form.requestSubmit());
const useScanner = new Signal.State(false);
const formats = [CODE_128];

const sheet = css`#${SCANNER_ID} {
	& .scanner-notice {
		border: 1px solid #dee2e6;
		padding: 15px;
		border-radius: 8px;
		margin: 20px 0;
	}

	& .scanner-notice h3 {
		margin-top: 0;
	}

	& .scanner-notice p {
		line-height: 1.5;
	}

	& .scanner-notice p:last-child {
		margin-bottom: 0;
	}

	& .btn-container {
		background-color: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(3px);
		padding: 0.6rem;
		border-top: 2px solid #fafafa;
	}

	& [popover] {
		min-width: max(80%, 600px);
		max-height: 90dvh;
		overflow-y: auto;
	}
}`;

async function showError(message, { timeout = ERROR_DURATION } = {}) {
	const id = '_' + crypto.randomUUID();
	const { resolve, promise } = Promise.withResolvers();
	const popover = el`<div class="status-box error oasis-error" id="${id}" popover="auto">
		<button type="button" class="btn btn-outline-danger absolute top right" command="hide-popover" commandfor="${id}" aria-label="Close Popover">X</button>
		<p class="clearfix">${message}</p>
	</div>`;

	popover.addEventListener('toggle', ({ target, newState }) => {
		if (newState === 'closed') {
			target.remove();
			resolve();
		}
	});

	document.body.append(popover);
	popover.showPopover();
	setTimeout(() => {
		if (popover.isConnected) {
			popover.hidePopover();
		}
	}, timeout);

	return promise;
}

const submitHandler = registerCallback('oasis:id:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;
	const data = new FormData(target);
	const { type, id } = data.get(NAME)?.trim()?.match(OASIS_ID_PATTERN)?.groups ?? {};

	if (typeof type === 'string' && typeof id === 'string') {
		try {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = true;
			}
			switch(type) {
				case 'C':
					globalThis.open(
						url`${OASIS_ORIGIN}cases/${parseInt(id)}/case_barcode_lookup/`,
						OASIS_NAME,
						'noopener,noreferrer'
					);

					break;

				default:
					await showError(`Unsupported type [${type}] with ID <q>${id}</q>`);
					target.reset();
			}
		} catch(err) {
			await showError(err);
		} finally {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = false;
			}
		}
	} else {
		target.reset();
	}
});

const submitLicense = registerCallback('oasis:license:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		if (submitter instanceof HTMLButtonElement) {
			submitter.disabled = true;
		}

		const data = new FormData(target);
		const barcode = data.get(NAME).trim();
		// Save barcode/ID to clipboard to create to paste into profile if not found
		await navigator.clipboard.writeText(barcode).catch(reportError);
		globalThis.open(
			url`${OASIS_ORIGIN}cases/barcode/scan/?associated_barcode_name=${barcode}`,
			OASIS_NAME,
			'noopener,noreferrer'
		);
	} catch(err) {
		await showError(err);
	} finally {
		if (submitter instanceof HTMLButtonElement) {
			submitter.disabled = false;
		}

		target.reset();
	}
});

const beforeToggle = registerCallback('oasis:form:beforeToggle', ({ target, newState }) => {
	if (newState === 'open') {
		document.querySelector(':popover-open')?.hidePopover();
		const video = target.querySelector('video');

		if (useScanner.get() && video instanceof HTMLVideoElement && video.hasAttribute('data-preview-for')) {
			const controller = new AbortController();
			const signal = AbortSignal.any([getSignal(target.getAttribute(signalAttr)), controller.signal]);
			target.querySelector('details').open = true;

			createBarcodeScanner(result => {
				target.elements.namedItem(video.dataset.previewFor).value = result.rawValue;
				// target.requestSubmit();
			}, { video, signal, formats });

			target.addEventListener('toggle', ({ newState }) => {
				if (newState === 'closed') {
					controller.abort();
				}
			}, { signal });
		}

		target.animate([
			{ opacity: 0, transform: 'scale(0.2)' },
			{ opacity: 1, transform: 'none' },
		], {
			duration: 400,
			easing: 'ease-out',
		});
	}
});

const toggleScanner = registerCallback('oasis:scanner:toggle', ({ currentTarget }) => {
	if (useScanner.get()) {
		useScanner.set(false);
		currentTarget.classList.add('btn-info');
		currentTarget.classList.remove('btn-warning');
		// history.replaceState({ ...history.state ?? {}, useScanner: false });
	} else {
		useScanner.set(true);
		currentTarget.classList.add('btn-warning');
		currentTarget.classList.remove('btn-info');
		// history.replaceState({ ...history.state ?? {}, useScanner: true });
	}
});

window.useScanner = useScanner;
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

preloadRxing();

export default ({ signal, stack }) => {
	// Need to do this because `<form action>` is stripped by sanitizer
	stack.defer(() => document.forms['oasis-search'].action = `${OASIS_ORIGIN}search/advanced/`);

	return html`<div id="${SCANNER_ID}">
		<form ${onSubmit}="${submitHandler}" id="oasis-scanner" popover="auto" ${onBeforetoggle}="${beforeToggle}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border" autocomplete="off">
				<legend>Oasis Case Scanner</legend>
				<details class="center">
					<summary class="btn btn-primary btn-block">Use Barcode Scanner</summary>
					<video id="${INPUT_ID}-preview" data-preview-for="${NAME}"></video>
				</details>
				<div class="form-group">
					<label for="${INPUT_ID}" class="input-label">Barcode</label>
					<input type="text" name="${NAME}" id="${INPUT_ID}" class="input" pattern="${PATTERN_STR}" placeholder="{[X]########}" autocomplete="off" ${onBlur}="${submitOnBlur}" ${signalAttr}="${signal}" autofocus="" required="" />
				</div>
			</fieldset>
			<div class="flex row space-evenly">
				<button type="submit" class="btn btn-success btn-lg">Submit</button>
				<button type="reset" class="btn btn-danger btn-lg">Reset</button>
				<button type="button" command="hide-popover" commandfor="oasis-scanner" class="btn btn-warning btn-lg">Dismiss</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-info">Scan Other ID</button>
				<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-info">Advanced Search</button>
			</div>
		</form>
		<form id="license-scanner" popover="auto" ${onSubmit}="${submitLicense}" ${onBeforetoggle}="${beforeToggle}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border">
				<legend>Scan Driver's License</legend>
				<details class="center">
					<summary class="btn btn-primary btn-block">Use Barcode Scanner</summary>
					<video id="${INPUT_ID}-preview" data-preview-for="${NAME}"></video>
				</details>
				<div class="form-group">
					<label for="license" class="input-label required">Driver's License</label>
					<input type="text" name="${NAME}" id="license" class="input" placeholder="#########" autocomplete="off" minlength="8" autofocus="" required="" />
				</div>
			</fieldset>
			<div class="flex row wrap space-evenly">
				<button type="submit" class="btn btn-success btn-lg">Submit</button>
				<button type="reset" class="btn btn-danger btn-lg">Reset</button>
				<button type="button" command="hide-popover" commandfor="license-scanner" class="btn btn-warning btn-lg">Dismiss</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-info">Scan Oasis ID</button>
				<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-info">Advanced Search</button>
			</div>
		</form>
		<form id="oasis-search" popover="auto" action="${OASIS_ORIGIN}search/advanced/" method="POST" rel="noopener noreferrer external" target="${OASIS_NAME}" class="no-router" ${onBeforetoggle}="${beforeToggle}" ${signalAttr}="${signal}">
			<fieldset class="no-border">
				<legend>Oasis Advanced Search</legend>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-first_name" class="input-label">First Name</label>
					<input type="text" name="first_name" id="${OASIS_SEARCH_ID}-first_name" class="input" placeholder="First Name" autocomplete="off" autofocus="" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-last_name" class="input-label">Last Name</label>
					<input type="text" name="last_name" id="${OASIS_SEARCH_ID}-last_name" class="input" placeholder="Last Name" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-date_of_birth" class="input-label">Date of Birth</label>
					<input type="date" name="date_of_birth" id="${OASIS_SEARCH_ID}-date_of_birth" class="input" placeholder="YYYY-MM-DD" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-street_address" class="input-label">Street Address</label>
					<input type="text" name="street_address" id="${OASIS_SEARCH_ID}-street_address" class="input" placeholder="Street Address" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-street_city" class="input-label">City</label>
					<input type="text" name="street_city" id="${OASIS_SEARCH_ID}-street_city" class="input" placeholder="City" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-street_state" class="input-label">State</label>
					<input type="text" name="street_state" id="${OASIS_SEARCH_ID}-street_state" class="input" placeholder="State" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-street_zip_code" class="input-label">Zip Code</label>
					<input type="text" name="street_zip_code" id="${OASIS_SEARCH_ID}-street_zip_code" class="input" placeholder="Zip Code" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-phone" class="input-label">Phone</label>
					<input type="tel" name="phone" id="${OASIS_SEARCH_ID}-phone" class="input" placeholder="Phone Number" autocomplete="off" />
				</div>
				<div class="form-group">
					<label for="${OASIS_SEARCH_ID}-email" class="input-label">Email</label>
					<input type="email" name="email" id="${OASIS_SEARCH_ID}-email" class="input" placeholder="Email Address" autocomplete="off" />
				</div>
			</fieldset>
			<div class="flex row space-evenly sticky bottom full-width btn-container">
				<button type="submit" class="btn btn-success btn-lg">Submit</button>
				<button type="reset" class="btn btn-danger btn-lg">Reset</button>
				<button type="button" command="hide-popover" commandfor="oasis-search" class="btn btn-warning btn-lg">Dismiss</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-info btn-lg">Scan Oasis ID</button>
				<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-info btn-lg">Scan Other ID</button>
			</div>
		</form>
		<div class="scanner-notice">
		<h3>A Quick Note About This Scanner</h3>
		<p>
			<strong>Your information is safe and private.</strong> When you scan an ID here, absolutely nothing is saved, recorded, or sent to us. This page just acts as a bridge to pass your scan directly into the Oasis system.
		</p>
		<p>
			<strong>This is a temporary fix.</strong> We set this up because the barcode scanner feature inside the Oasis Platform is currently broken. We are using this as a workaround until they fix the bug on their end.
		</p>
		</div>
		<a href="${OASIS_ORIGIN}logged_out/" target="${OASIS_NAME}" rel="noopener noreferrer external" class="btn btn-secondary" accesskey="0">Sign-in on Oasis</a>
		<button type="button" class="btn btn-info" ${onClick}="${toggleScanner}" ${signalAttr}="${signal}">Toggle Camera</button>
		<hr />
		<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-primary btn-lg" accesskey="1">Scan Oasis ID</button>
		<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-primary btn-lg" accesskey="2">Scan Other ID</button>
		<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-primary btn-lg" accesskey="3">Advanced Search</button>
	</div>`;
};
