import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onChange, onSubmit, onReset, onToggle, signal as signalAttr, getSignal } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';
import { createBarcodeScanner, preloadRxing, CODE_128 } from '@aegisjsproject/barcodescanner';
// import { Signal } from '@shgysk8zer0/signals';

const SCANNER_PATTERN = /^(?:\{?\[?(?<type>[A-Za-z])\]?(?<id>\d{5,13})\}?|(?<barcode>[A-Z0-9]{12,17}))$/;
const PHONE_PATTERN = /^(?<phone_0>\d{3})(?<phone_1>\d{3})(?<phone_2>\d{4})$/;
const SCANNER_PATTERN_STR = SCANNER_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const OASIS_ORIGIN = 'https://capkfoodbank.oasisinsight.net/';
const PAIRING = 'https://i.imgur.com/S1v2MbT.webp';
const OASIS_NAME = 'Oasis';
const OASIS_SEARCH_ID = 'oasis-search-form';
const ERROR_DURATION = 5_000;
const SCANNER_ID = '_' + crypto.randomUUID();
const FOCUS_OPTS = { preventScroll: false, focusvisible: true };
const resetHandler = registerCallback('oasis:reset', ({ target }) => {
	const elements = target.elements;
	if (target.id === 'oasis-search') {
		['phone_0', 'phone_1', 'phone_2', 'date_of_birth_0', 'date_of_birth_1', 'date_of_birth_2'].forEach(field => {
			elements.namedItem(field).value = null;
		});
	} else {
		elements.namedItem(NAME)?.focus(FOCUS_OPTS);
	}
});

const formats = [CODE_128];

const idCardBtnScreenshot = 'https://i.imgur.com/07ISr9K.png';
const idCardScreenshot = 'https://i.imgur.com/N983kQSh.png';

const scannerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="icon" fill="currentColor" viewBox="0 0 24 24" role="presentation">
	<path d="M2 5h2v14H2zm4 0h1v14H6zm3 0h3v14H9zm5 0h1v14h-1zm3 0h2v14h-2zm4 0h1v14h-1z"/>
</svg>`;

const cameraIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" version="1" viewBox="0 0 16 16" fill="currentColor" role="presentation">
    <path d="M6 2c-.55 0-1 .45-1 1v1H2c-.552 0-1 .45-1 1v8c0 .55.448 1 1 1h12c.552 0 1-.45 1-1V5c0-.55-.448-1-1-1h-3V3c0-.55-.45-1-1-1H6zm2 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" overflow="visible"/>
</svg>`;

const check = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" class="icon check-icon" viewBox="0 0 12 16" fill="currentColor" role="presentation">
	<path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
</svg>`;

const x = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" class="icon x-icon" fill="currentColor" role="presentation">
	<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
</svg>`;

const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" class="icon" fill="currentColor" viewBox="0 0 16 16" role="presentation">
	<path fill-rule="evenodd" d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
</svg>`;

const helpIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" class="icon" fill="currentColor" viewBox="0 0 14 16" role="presentation">
	<path fill-rule="evenodd" d="M6 10h2v2H6v-2zm4-3.5C10 8.64 8 9 8 9H6c0-.55.45-1 1-1h.5c.28 0 .5-.22.5-.5v-1c0-.28-.22-.5-.5-.5h-1c-.28 0-.5.22-.5.5V7H4c0-1.5 1.5-3 3-3s3 1 3 2.5zM7 2.3c3.14 0 5.7 2.56 5.7 5.7s-2.56 5.7-5.7 5.7A5.71 5.71 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zM7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z"/>
</svg>`;

const signInIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" class="icon" fill="currentColor" viewBox="0 0 14 16" role="presentation">
	<path fill-rule="evenodd" d="M7 6.75V12h4V8h1v4c0 .55-.45 1-1 1H7v3l-5.45-2.72c-.33-.17-.55-.52-.55-.91V1c0-.55.45-1 1-1h9c.55 0 1 .45 1 1v3h-1V1H3l4 2v2.25L10 3v2h4v2h-4v2L7 6.75z"/>
</svg>`;

export const styles = css`#${SCANNER_ID} {
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

	& .flex > .btn {
		margin-top: 0.8em;
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
	const { type, id, barcode } = data.get(NAME)?.trim()?.match(SCANNER_PATTERN)?.groups ?? {};

	if (typeof type === 'string' && typeof id === 'string') {
		try {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = true;
			}
			switch(type.toUpperCase()) {
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
	} else if (typeof barcode === 'string') {
		try {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = true;
			}

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
	} else {
		target.reset();
	}
});

const toggleOasisScanner = registerCallback('oasis:scanner:toggle', async ({ currentTarget }) => {
	const summary = currentTarget.firstElementChild;
	if (currentTarget.open) {
		const { promise, resolve } = Promise.withResolvers();
		const disposable = new DisposableStack();
		const controller = disposable.adopt(new AbortController(), controller => controller.abort());
		const video = disposable.adopt(currentTarget.querySelector('video'), video => video.srcObject = null);
		const signal = getSignal(currentTarget.getAttribute(signalAttr));
		summary.classList.add('btn-warning');
		summary.classList.remove('btn-primary');

		disposable.use(await createBarcodeScanner(result => {
			const input = currentTarget.closest('form').elements.namedItem(NAME);
			input.value = result.rawValue;
			input.focus(FOCUS_OPTS);
		}, { video, signal, formats, stack: disposable }));

		currentTarget.addEventListener('toggle', ({ target }) => {
			if (! target.open) {
				resolve();
				disposable.dispose();
			}
		}, { signal: AbortSignal.any([signal, controller.signal ]) });

		await promise;
	} else {
		summary.classList.remove('btn-warning');
		summary.classList.add('btn-primary');
	}
});

const updateBirthdayFields = registerCallback('oasis:birthdate:change', ({ target }) => {
	/**
	 * @type {HTMLCollection}
	 */
	const elements = target.form.elements;

	if (target.value.length !== 0 && target.validity.valid) {
		const [year, month, day] = target.value.split('-');
		elements.namedItem('date_of_birth_0').value = month;
		elements.namedItem('date_of_birth_1').value = day;
		elements.namedItem('date_of_birth_2').value = year;
	} else {
		elements.namedItem('date_of_birth_0').value = null;
		elements.namedItem('date_of_birth_1').value = null;
		elements.namedItem('date_of_birth_2').value = null;
	}
});

const updatePhoneFields = registerCallback('oasis:phone:change', ({ target }) => {
	/**
	 * @type {HTMLCollection}
	 */
	const elements = target.form.elements;

	if (target.validity.valid && target.value.length !== 0) {
		const result = PHONE_PATTERN.exec(target.value.trim().replaceAll(/\D/g, '').slice(-10));
		elements.namedItem('phone_0').value = result?.groups?.phone_0;
		elements.namedItem('phone_1').value = result?.groups?.phone_1;
		elements.namedItem('phone_2').value = result?.groups?.phone_2;
	} else {
		elements.namedItem('phone_0').value = null;
		elements.namedItem('phone_1').value = null;
		elements.namedItem('phone_2').value = null;
	}
});

if (! ('BarcodeDetector' in globalThis)) {
	preloadRxing();
}

export default ({ signal, stack }) => {
	// Need to do this because `<form action>` is stripped by sanitizer
	stack.defer(() => document.forms['oasis-search'].action = `${OASIS_ORIGIN}search/advanced/`);

	return html`<div id="${SCANNER_ID}">
		<form ${onSubmit}="${submitHandler}" id="oasis-scanner" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border" autocomplete="off">
				<legend>Oasis Case Scanner</legend>
				<div class="scanner-notice">
					<h3>A Quick Note About This Scanner</h3>
					<p>
						<strong>Your information is safe and private.</strong> When you scan an ID here, absolutely nothing is saved, recorded, or sent to us. This page just acts as a bridge to pass your scan directly into the Oasis system.
					</p>
					<p>
						<strong>This is a temporary fix.</strong> We set this up because the barcode scanner feature inside the Oasis Platform is currently broken. We are using this as a workaround until they fix the bug on their end.
					</p>
				</div>
				<div class="form-group">
					<label for="${INPUT_ID}" class="input-label">Oasis Barcode ${scannerIcon}</label>
					<input type="text" name="${NAME}" id="${INPUT_ID}" class="input" pattern="${SCANNER_PATTERN_STR}" placeholder="{[X]########}" autocomplete="off" ${signalAttr}="${signal}" autofocus="" required="" />
				</div>
				<details class="center scanner-preview" ${onToggle}="${toggleOasisScanner}" ${signalAttr}="${signal}">
					<summary class="btn btn-primary" accesskey="c">
						<span>Toggle Barcode Scanner (Camera)</span>
						${cameraIcon}
					</summary>
					<video id="${INPUT_ID}-preview" class="full-width" data-preview-for="${NAME}"></video>
				</details>
			</fieldset>
			<div class="flex row wrap space-evenly">
				<button type="submit" class="btn btn-success btn-lg">
					<span>Submit</span>
					${check}
				</button>
				<button type="reset" class="btn btn-danger btn-lg" accesskey="r">
					<span>Reset</span>
					${x}
				</button>
				<button type="button" command="show-popover" commandfor="oasis-search" accesskey="s" class="btn btn-info">
					<span>Advanced Search</span>
					${searchIcon}
				</button>
			</div>
		</form>
		<form id="oasis-search" popover="auto" action="${OASIS_ORIGIN}search/advanced/" method="POST" rel="noopener noreferrer external" target="${OASIS_NAME}" class="no-router" ${signalAttr}="${signal}">
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
					<input type="date" id="${OASIS_SEARCH_ID}-date_of_birth" class="input" placeholder="YYYY-MM-DD" ${onChange}="${updateBirthdayFields}" autocomplete="off" ${signalAttr}="${signal}" />
					<input type="hidden" id="${OASIS_SEARCH_ID}-date_of_birth_year" name="date_of_birth_2" />
					<input type="hidden" id="${OASIS_SEARCH_ID}-date_of_birth_month" name="date_of_birth_0" />
					<input type="hidden" id="${OASIS_SEARCH_ID}-date_of_birth_day" name="date_of_birth_1" />
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
					<input type="tel" id="${OASIS_SEARCH_ID}-phone" class="input" minlength="10" maxlength="17" placeholder="Phone Number" ${onChange}="${updatePhoneFields}" autocomplete="off" ${signalAttr}="${signal}" />
					<input type="hidden" name="phone_0" />
					<input type="hidden" name="phone_1" />
					<input type="hidden" name="phone_2" />
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
		</form>
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

				<h2>Pairing your Nuscan Device</h2>
				<ol>
					<li>Pull the trigger to power-on the device</li>
					<li>Scan the barcode labeled <q>2.4GHz Mode</q> to set the correct mode</li>
					<li>Scan the <q>2.4GHz or Bluetooth Pairing</q> barcode to pair</li>
					<li>Within 15 seconds, remove the dongle from the device's handle and plug it into a USB port on a device</li>
					<li>The status light will turn blue if it is successful</li>
				</ol>
				<img src="${PAIRING}" alt="Pairing Barcodes" loading="lazy" decoding="async" width="730" height="738" crossorigin="anonymous" referrerpolicy="no-referrer" />

				<hr />

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

				<h2>Scanning and Searching</h2>
				<h3>🔹 Scan Barcode</h3>
				<p>Use this if the volunteer has their official printed ID card or ID with barcode. Click the button, then scan the barcode. If you scan a barcode such as a Driver's License, it will be copied to your clipboard and ready to paste if you need to link it to a client.</p>

				<h3>🔹 Advanced Search</h3>
				<p>If they forgot their ID, use this button to search by Name, Birthday, Address, etc...</p>
				<p><strong>Note</strong>: The date picker may vary by device. On devices that show a popover date picker, you may have to tap on the year to quickly select the year.</p>

				<hr>

				<h2>Using the Camera</h2>
				<p><strong>Do you have a handheld barcode scanner gun?</strong><br>
				Great! You don't need to change any settings. Just click a blue button and scan.</p>

				<p><strong>No scanner? Use your Webcam:</strong><br>
				You can use your laptop or tablet camera to scan barcodes.</p>
				<ul>
					<li>
						<strong>To Turn ON:</strong> Click the <span class="btn btn-primary">Toggle Barcode Scanner (Camera)</span> button. A video preview will appear.
					</li>
					<li>
						<strong>To Turn OFF:</strong> Click the <span class="btn btn-warning">Toggle Barcode Scanner (Camera)</span> button.
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
							<td><strong>(<kbd>L</kbd>)</strong>ogin</td>
							<td>Go to Login</td>
						</tr>
						<tr>
							<td><strong>(<kbd>S</kbd>)</strong>earch</td>
							<td>Advanced Search</td>
						</tr>
						<tr>
							<td><strong>(<kbd>C</kbd>)</strong>amera</td>
							<td>Toggle Camera On/Off</td>
						</tr>
						<tr>
							<td><strong>(<kbd>R</kbd>)</strong>eset</td>
							<td>Clear/Reset the barcode form</td>
						</tr>
						<tr>
							<td><strong>(<kbd>H</kbd>)</strong>elp</td>
							<td>Open this Help menu</td>
						</tr>
					</tbody>
				</table>
			</div>
		</dialog>
		<a href="${OASIS_ORIGIN}login/" target="${OASIS_NAME}" rel="noopener noreferrer external" class="btn btn-link" accesskey="l">
			<span>Sign-in on Oasis</span>
			${signInIcon}
		</a>
		<button type="button" class="btn btn-info" command="show-modal" commandfor="oasis-help" accesskey="h">
			<span>Help</span>
			${helpIcon}
		</button>
	</div>`;
};

export const title = 'Oasis Scanner Tool - KRV Bridge Connection';

export const description = 'A temporary utility to help scan barcodes for the Oasis Platform';
