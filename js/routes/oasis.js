import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onBlur, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';

// openDialog('Scan Barcodes','Loading...','/cases/barcode/scan/?associated_barcode_name='+String(associatedBarcodeBuffer)+'&auto_rapid_scan='+getCookie('auto_rapid_scan'));

const ID_PATTERN = /^\{\[(?<type>[A-Z])\](?<id>\d{6,13})\}$/;
const PATTERN_STR = ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const OASIS_ORIGIN = 'https://capkfoodbank.oasisinsight.net/';
const OASIS_NAME = 'Oasis';
const ERROR_DURATION = 5_000;
const SCANNER_ID = '_' + crypto.randomUUID();
const resetHandler = registerCallback('oasis:reset', ({ target }) => target.elements.namedItem(NAME).focus());
const submitOnBlur = registerCallback('oasis:blur', ({ target }) => target.validity.valid && target.form.requestSubmit());

const sheet = css`${SCANNER_ID} {
	& .scanner-notice {
		background-color: #f8f9fa;
		border: 1px solid #dee2e6;
		padding: 15px;
		border-radius: 8px;
		font-family: sans-serif;
		max-width: 600px;
		margin: 20px 0;
	}

	& .scanner-notice h3 {
		margin-top: 0;
		color: #212529;
	}

	& .scanner-notice p {
		color: #495057;
		line-height: 1.5;
	}

	& .scanner-notice p:last-child {
		margin-bottom: 0;
	}
}`;

async function showError(message, { timeout = ERROR_DURATION } = {}) {
	const id = '_' + crypto.randomUUID();
	const { resolve, promise } = Promise.withResolvers();
	const popover = el`<div class="status-box error oasis-error" id="${id}" popover="auto">
		<button type="button" class="btn btn-outline-danger absolute top right" command="hide-popover" commandfor="${id}" aria-label="Close Popove">X</button>
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
	const { type, id } = data.get(NAME)?.trim()?.match(ID_PATTERN)?.groups ?? {};

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

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

export default ({ signal }) => html`<div id="${SCANNER_ID}">
	<form ${onSubmit}="${submitHandler}" id="oasis-scanner" popover="manual" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
		<fieldset class="no-border">
			<legend>Oasis Case Scanner</legend>
			<div class="form-group">
				<label for="${INPUT_ID}" class="input-label">Barcode</label>
				<input type="text" name="${NAME}" id="${INPUT_ID}" class="input" pattern="${PATTERN_STR}" placeholder="{[X]########}" autocomplete="off" ${onBlur}="${submitOnBlur}" ${signalAttr}="${signal}" autofocus="" required="" />
			</div>
		</fieldset>
		<button type="submit" class="btn btn-success btn-lg">Submit</button>
		<button type="reset" class="btn btn-danger btn-lg">Reset</button>
		<button type="button" command="hide-popover" commandfor="oasis-scanner" class="btn btn-warning btn-lg">Dismiss</button>
	</form>
	<form id="license-scanner" popover="manual" ${onSubmit}="${submitLicense}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
		<fieldset class="no-border">
			<legend>Scan Driver's License</legend>
			<div class="form-group">
				<label for="license" class="input-label required">Driver's License</label>
				<input type="text" name="${NAME}" id="license" class="input" placeholder="#########" autocomplete="off" minlength="8" autofocus="" required="" />
			</div>
		</fieldset>
		<button type="submit" class="btn btn-success btn-lg">Submit</button>
		<button type="reset" class="btn btn-danger btn-lg">Reset</button>
		<button type="button" command="hide-popover" commandfor="license-scanner" class="btn btn-warning btn-lg">Dismiss</button>
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
	<a href="${OASIS_ORIGIN}logged_out/" target="${OASIS_NAME}" rel="noopener noferrer external" class="btn btn-secondary" accesskey="s">Sign-in on Oasis</a>
	<hr />
	<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-primary btn-lg" accesskey="o">Scan Oasis ID</button>
	<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-primary btn-lg" accesskey="i">Scan Other ID</button>
</div>`;
