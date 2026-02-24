import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, onReset, onBeforetoggle, onCommand, signal as signalAttr, getSignal } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';
import { createBarcodeScanner, preloadRxing, CODE_128 } from '@aegisjsproject/barcodescanner';
import { Signal } from '@shgysk8zer0/signals';

const OASIS_ID_PATTERN = /^\{\[(?<type>[A-Z])\](?<id>\d{6,13})\}$/;
const BARCODE_ID_PATTERN = /^[A-Z0-9]{12,17}$/;
const BARCODE_PATTERN_STR = BARCODE_ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const OASIS_PATTERN_STR = OASIS_ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const OASIS_ORIGIN = 'https://capkfoodbank.oasisinsight.net/';
const OASIS_NAME = 'Oasis';
const OASIS_SEARCH_ID = 'oasis-search-form';
const ERROR_DURATION = 5_000;
const SCANNER_ID = '_' + crypto.randomUUID();
const resetHandler = registerCallback('oasis:reset', ({ target }) => target.elements.namedItem(NAME)?.focus());
const useScanner = new Signal.State(false);
const formats = [CODE_128];

const idCardBtnScreenshot = 'https://i.imgur.com/07ISr9K.png';
const idCardScreenshot = 'https://i.imgur.com/N983kQSh.png';

const scannerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="icon" fill="currentColor" viewBox="0 0 24 24" role="presentation">
	<path d="M2 5h2v14H2zm4 0h1v14H6zm3 0h3v14H9zm5 0h1v14h-1zm3 0h2v14h-2zm4 0h1v14h-1z"/>
</svg>`;

const check = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" class="icon check-icon" viewBox="0 0 12 16" fill="currentColor" role="presentation">
	<path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
</svg>`;

const x = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" class="icon x-icon" fill="currentColor" role="presentation">
	<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
</svg>`;

const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="icon" fill="currentColor" viewBox="0 0 16 16" role="presenttion">
	<path fill-rule="evenodd" d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
</svg>`;

const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" class="icon" fill="currentColor" viewBox="0 0 14 16" role="presentation">
	<path fill-rule="evenodd" d="M6 10h2v2H6v-2zm4-3.5C10 8.64 8 9 8 9H6c0-.55.45-1 1-1h.5c.28 0 .5-.22.5-.5v-1c0-.28-.22-.5-.5-.5h-1c-.28 0-.5.22-.5.5V7H4c0-1.5 1.5-3 3-3s3 1 3 2.5zM7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z"/>
</svg>`;

const signInIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" class="icon" fill="currentColor" viewBox="0 0 14 16" role="presentation">
	<path fill-rule="evenodd" d="M7 6.75V12h4V8h1v4c0 .55-.45 1-1 1H7v3l-5.45-2.72c-.33-.17-.55-.52-.55-.91V1c0-.55.45-1 1-1h9c.55 0 1 .45 1 1v3h-1V1H3l4 2v2.25L10 3v2h4v2h-4v2L7 6.75z"/>
</svg>`;

const sheet = css`#${SCANNER_ID} {
	& .scanner-notice {
		border: 1px solid #dee2e6;
		padding: 15px;
		border-radius: 8px;
		margin: 20px 0;
	}

	&:not(:has(.btn.scanner-active)) {
		details.scanner-preview {
			display: none;
		}
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

	& .flex > .btn {
		margin-top: 0.8em;
	}

	& .scanner-toggle {
		&.scanner-active {
			& .check-icon {
				display: none;
			}
		}

		&:not(.scanner-active ){
			& .x-icon {
				display: none;
			}
		}
	}

	& figure {
		border: 1px solid currentColor;
		border-radius: 4px;
		padding: 1.2em;
	}

	& figcaption {
		color: inherit;
	}

	& [popover] {
		width: min(95%, 800px);
		max-height: 90dvh;
		overflow-y: auto;
		border-width: 1px;
		border-radius: 6px;

		&::backdrop {
			background-color: rgba(0, 0, 0, 0.8);
			backdrop-filter: blur(3px);
		}
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

			target.reset();
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
		currentTarget.classList.remove('scanner-active');
		currentTarget.classList.remove('btn-warning');
	} else {
		useScanner.set(true);
		currentTarget.classList.add('btn-warning');
		currentTarget.classList.add('scanner-active');
		currentTarget.classList.remove('btn-info');
	}
});

const handleCommand = registerCallback('oasis:command', ({ target, source, command }) => {
	switch(command) {
		case '--copy':
			if (target.validity.valid) {
				navigator.clipboard.writeText(target.value).catch(() => source.disabled = true);
			}
			break;
	}
});

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

if (! ('BarcodeDetector' in globalThis)) {
	preloadRxing();
}

export default ({ signal, stack }) => {
	// Need to do this because `<form action>` is stripped by sanitizer
	stack.defer(() => document.forms['oasis-search'].action = `${OASIS_ORIGIN}search/advanced/`);

	return html`<div id="${SCANNER_ID}">
		<form ${onSubmit}="${submitHandler}" id="oasis-scanner" popover="auto" ${onBeforetoggle}="${beforeToggle}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border" autocomplete="off">
				<legend>Oasis Case Scanner</legend>
				<details class="center scanner-preview">
					<summary class="btn btn-primary btn-block">Use Barcode Scanner</summary>
					<video id="${INPUT_ID}-preview" class="full-width" data-preview-for="${NAME}"></video>
				</details>
				<div class="form-group">
					<label for="${INPUT_ID}" class="input-label">Oasis Barcode ${scannerIcon}</label>
					<input type="text" name="${NAME}" id="${INPUT_ID}" class="input" pattern="${OASIS_PATTERN_STR}" placeholder="{[X]########}" autocomplete="off" ${signalAttr}="${signal}" autofocus="" required="" />
				</div>
			</fieldset>
			<div class="flex row wrap space-evenly">
				<button type="submit" class="btn btn-success btn-lg">
					<span>Submit</span>
					${check}
				</button>
				<button type="reset" class="btn btn-danger btn-lg">
					<span>Reset</span>
					${x}
				</button>
				<button type="button" command="hide-popover" commandfor="oasis-scanner" class="btn btn-warning btn-lg">
					<span>Dismiss</span>
					${x}
				</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-info">
					<span>Scan Other ID</span>
					${scannerIcon}
				</button>
				<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-info">
					<span>Advanced Search</span>
					${searchIcon}
				</button>
			</div>
		</form>
		<form id="license-scanner" popover="auto" ${onSubmit}="${submitLicense}" ${onBeforetoggle}="${beforeToggle}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border">
				<legend>Scan Other ID Barcode</legend>
				<details class="center scanner-preview">
					<summary class="btn btn-primary btn-block">Use Barcode Scanner</summary>
					<video id="${INPUT_ID}-preview" class="full-width" data-preview-for="${NAME}"></video>
				</details>
				<div class="form-group">
					<label for="license" class="input-label required">Other ID Barcode ${scannerIcon}</label>
					<div class="flex row">
						<input type="text" name="${NAME}" id="license" class="input grow-1" placeholder="#########" pattern="${BARCODE_PATTERN_STR}" autocomplete="off" minlength="13" maxlength="17" ${onCommand}="${handleCommand}" ${signalAttr}="${signal}" autofocus="" required="" />
						<button type="button" command="--copy" commandfor="license" class="btn btn-outline-secondary btn-small" aria-label="Copy">
							<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" fill="currentColor" class="icon" viewBox="0 0 14 16" role="presentation">
								<path fill-rule="evenodd" d="M2 13h4v1H2v-1zm5-6H2v1h5V7zm2 3V8l-3 3 3 3v-2h5v-2H9zM4.5 9H2v1h2.5V9zM2 12h2.5v-1H2v1zm9 1h1v2c-.02.28-.11.52-.3.7-.19.18-.42.28-.7.3H1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h3c0-1.11.89-2 2-2 1.11 0 2 .89 2 2h3c.55 0 1 .45 1 1v5h-1V6H1v9h10v-2zM2 5h8c0-.55-.45-1-1-1H8c-.55 0-1-.45-1-1s-.45-1-1-1-1 .45-1 1-.45 1-1 1H3c-.55 0-1 .45-1 1z"/>
							</svg>
						</button>
					</div>
				</div>
			</fieldset>
			<div class="flex row wrap space-evenly">
				<button type="submit" class="btn btn-success btn-lg">
					<span>Submit</span>
					${check}
				</button>
				<button type="reset" class="btn btn-danger btn-lg">
					<span>Reset</span>
					${x}
				</button>
				<button type="button" command="hide-popover" commandfor="license-scanner" class="btn btn-warning btn-lg">
					<span>Dismiss</span>
					${x}
				</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-info">
					<span>Scan Oasis ID</span>
					${scannerIcon}
				</button>
				<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-info">
					<span>Advanced Search</span>
					${searchIcon}
				</button>
				<a href="${OASIS_ORIGIN}bulletins/" target="${OASIS_NAME}" class="btn btn-link" rel="noreferrer noopener external">
					<span>Open Oasis</span>
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" fill="currentColor" class="icon" viewBox="0 0 12 16" role="presentation">
						<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
					</svg>
				</a>
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
			<div class="flex row wrap space-evenly sticky bottom full-width btn-container">
				<button type="submit" class="btn btn-success btn-lg">
					<span>Submit</span>
					${check}
				</button>
				<button type="reset" class="btn btn-danger btn-lg">
					<span>Reset</span>
					${x}
				</button>
				<button type="button" command="hide-popover" commandfor="oasis-search" class="btn btn-warning btn-lg">
					<span>Dismiss</span>
					${x}
				</button>
			</div>
			<br />
			<div>
				<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-info btn-lg">
					<span>Scan Oasis ID</span>
					${scannerIcon}
				</button>
				<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-info btn-lg">
					<span>Scan Other ID</span>
					${scannerIcon}
				</button>
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
		<dialog id="oasis-help">
			<div class="help-content relative">
				<button type="button" class="btn btn-danger sticky top right" command="request-close" commandfor="oasis-help" aria-label="Dismiss Dialog">${x}</button>
				<h1>How to use this Scanner Tool</h1>
				<p>This tool helps you sign volunteers into the Oasis platform quickly. You can use a handheld barcode scanner, your device's camera, or type manually.</p>

				<hr>

				<h2>Important: Sign In First!</h2>
				<p>
					Before you start scanning badges or licenses, please click the <strong>Sign-in on Oasis</strong> button (top left).
					<br>
					<em>Note: If you are not signed in and try to scan a Driver's License, the system may open a blank page. If that happens, close that tab, sign in here, and try again.</em>
				</p>

				<hr>

				<h2>Linking an Oasis Profile with an ID</h2>

				<p>To link a new ID to a case, following these steps:</p>
				<ol>
					<li>Scan the barcode on their ID in the Other ID scanner</li>
					<li>Hit the copy button to copy the results</li>
					<li>Either lookup in existing case in <q>Advanced Search</q> or create a new case on Oasis.</li>
					<li>Once you are on their case profile, find the <q>ID Card</q> button at the bottom of the sidebar <i>(See screenshot below)</i></li>
					<li>In the ID Cards popup, click the <q>Add Barcode</q> button <i>(See Screenshot)</i></li>
				</ol>
				<figure class="block">
					<img src="${idCardBtnScreenshot}" alt="ID Card in Sidebar" width="438" height="230" crossorigin="anonymous" referrerpolicy="no-referrer" loading="lazy" decoding="async" />
					<figcaption class="current-inherit">In the Sidebar on a Profile / Case Page, you will find a link to ID Cards at the bottom.</figcaption>
				</figure>
				<figure>
					<img src="${idCardScreenshot}" alt="ID Card Dialog" width="1024" height="560" crossorigin="anonymous" referrerpolicy="no-referrer" loading="lazy" decoding="async" />
					<figcaption class="current-inherit">In the ID Cards, you will see a button to add an ID Card on the right side. Click this button and paste in the scanned ID to link it to the case.</figcaption>
				</figure>

				<h2>Ways to Scan</h2>
				<p>There are three main blue buttons to choose from depending on what the volunteer hands you:</p>

				<h3>🔹 Scan Oasis ID (Button 1)</h3>
				<p>Use this if the volunteer has their official printed ID card. Click the button, then scan the barcode.</p>

				<h3>🔹 Scan Other ID / Driver's License (Button 2)</h3>
				<p>Use this to scan the barcode on the back of a Driver's License.</p>
				<p><strong>Helpful Tip:</strong> When you scan a license and submit to look-up, this tool automatically copies the barcode number to your computer's "Clipboard." If the search doesn't find them, you can go to Advanced Search and <strong>Paste</strong> the number to try looking it up manually.</p>

				<h3>🔹 Advanced Search (Button 3)</h3>
				<p>If they forgot their ID, use this button to search by Name, Birthday, or Address.</p>

				<hr>

				<h2>Using the Camera</h2>
				<p><strong>Do you have a handheld barcode scanner gun?</strong><br>
				Great! You don't need to change any settings. Just click a blue button and scan.</p>

				<p><strong>No scanner? Use your Webcam:</strong><br>
				You can use your laptop or tablet camera to scan barcodes.</p>
				<ul>
					<li>
						<strong>To Turn ON:</strong> Click the <span class="btn btn-info">Toggle Camera &#10003;</span> button. A video preview will appear.
					</li>
					<li>
						<strong>To Turn OFF:</strong> Click the <span class="btn btn-warning">Toggle Camera &#10005;</span> button.
					</li>
				</ul>

				<hr>
				<h2>Keyboard Shortcuts</h2>
				<p>If you prefer using the keyboard, you can use "Access Keys." <br><em>(Note: Depending on your browser/computer, you usually hold <strong>Alt</strong> or <strong>Alt + Shift</strong> while pressing the key).</em></p>
				<!-- Copied from MDN for accesskey -->
				<table border="1" cellpadding="10">
					<tbody>
						<tr>
							<th></th>
							<th>Windows</th>
							<th>Linux</th>
							<th>Mac</th>
						</tr>
						<tr>
							<th>Firefox</th>
							<td colspan="2"><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd><em>key</em></kbd></td>
							<td>
								<kbd>Control</kbd> + <kbd>Option</kbd> +
								<kbd><em>key</em></kbd> or <kbd>Control</kbd> + <kbd>Alt</kbd> +
								<kbd><em>key</em></kbd>
							</td>
						</tr>
						<tr>
						<th>MS Edge</th>
							<td rowspan="2"><kbd>Alt</kbd> + <kbd><em>key</em></kbd></td>
							<td rowspan="2">
								<kbd>Control</kbd> + <kbd>Option</kbd> + <kbd><em>key</em></kbd><br>or <kbd>Control</kbd> + <kbd>Option</kbd> + <kbd>Shift</kbd> +
								<kbd><em>key</em></kbd>
							</td>
							<td rowspan="2"><kbd>Control</kbd> + <kbd>Option</kbd> + <kbd><em>key</em></kbd></td>
						</tr>
						<tr>
						<th>Google Chrome</th>
						</tr>
						<tr>
							<th>Safari</th>
							<td colspan="2">n/a</td>
							<td><kbd>Control</kbd> + <kbd>Option</kbd> + <kbd><em>key</em></kbd></td>
						</tr>
						<tr>
							<th>Opera</th>
							<td colspan="2"><kbd>Alt</kbd> + <kbd><em>key</em></kbd></td>
							<td><kbd>Control</kbd> + <kbd>Alt</kbd> + <kbd><em>key</em></kbd></td>
						</tr>
					</tbody>
				</table>
				<br />
				<table border="1" cellpadding="10">
					<thead>
						<tr>
							<th>Key</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>0</strong></td>
							<td>Go to Login</td>
						</tr>
						<tr>
							<td><strong>1</strong></td>
							<td>Scan Oasis ID</td>
						</tr>
						<tr>
							<td><strong>2</strong></td>
							<td>Scan Driver's License / Other</td>
						</tr>
						<tr>
							<td><strong>3</strong></td>
							<td>Advanced Search</td>
						</tr>
						<tr>
							<td><strong>C</strong></td>
							<td>Toggle Camera On/Off</td>
						</tr>
						<tr>
							<td><strong>H</strong></td>
							<td>Open this Help menu</td>
						</tr>
					</tbody>
				</table>
			</div>
		</dialog>
		<a href="${OASIS_ORIGIN}logged_out/" target="${OASIS_NAME}" rel="noopener noreferrer external" class="btn btn-link" accesskey="0">
			<span>Sign-in on Oasis</span>
			${signInIcon}
		</a>
		<button type="button" class="btn btn-info scanner-toggle" ${onClick}="${toggleScanner}" ${signalAttr}="${signal}" accesskey="C">
			<span>Toggle Camera</span>
			${x}${check}
		</button>
		<button type-"button" class="btn btn-info" command="show-modal" commandfor="oasis-help" accesskey="h">
			<span>Help</span>
			${helpIcon}
		</button>
		<hr />
		<div class="flex row wrap space-evenly">
			<button type="button" command="show-popover" commandfor="oasis-scanner" class="btn btn-primary btn-lg" accesskey="1">
				Scan Oasis ID
				${scannerIcon}
			</button>
			<button type="button" command="show-popover" commandfor="license-scanner" class="btn btn-primary btn-lg" accesskey="2">
				<span>Scan Other ID</span>
				${scannerIcon}
			</button>
			<button type="button" command="show-popover" commandfor="oasis-search" class="btn btn-primary btn-lg" accesskey="3">
				<span>Advanced Search</span>
				${searchIcon}
			</button>
		</div>
	</div>`;
};

export const title = 'Oasis Scanner Tool - KRV Bridge Connection';

export const description = 'A temporary utility to help scan barcodes for the Oasis Platform';
