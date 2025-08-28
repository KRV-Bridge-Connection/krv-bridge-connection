import { site } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onClick, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate, back } from '@aegisjsproject/router/router.js';
import { WEEKS, HOURS } from '@shgysk8zer0/consts/date.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state/state.js';
import { getSearch } from '@aegisjsproject/url/search.js';
import { attemptSync } from '@aegisjsproject/attempt';

const CARES_FORM = '/docs/cares-form.pdf';

const date = getSearch('date', '');

const OPENING_HOURS = [
	{ dayOfWeek: 'Sunday', opens: null, closes: null },
	{ dayOfWeek: 'Monday', opens: '13:00:00', closes: '16:00:00' },
	{ dayOfWeek: 'Tuesday', opens: '13:00:00', closes: '16:00:00' },
	{ dayOfWeek: 'Wednesday', opens: null, closes: null },
	{ dayOfWeek: 'Thursday', opens: null, closes: null },
	{ dayOfWeek: 'Friday', opens: '09:00:00', closes: '13:00:00' },
	{ dayOfWeek: 'Saturday', opens: null, closes: null },
];

const CLOSED = [
	'2025-08-21', // Ran empty
	'2025-08-22', // Pantry empty until Monday
	'2025-08-27', // Ran empty Wed
	'2025-98-28', // Still empty Thurs
	'2025-08-29', // Probably empty Fri too
	'2025-09-01', // Labor Day
	'2025-11-11', // Veterans Day
	'2025-11-27', // Thanksgiving
	'2025-11-28', // Day after Thanksgiving
	'2025-12-25', // Christmas
	'2026-01-01', // New Year's Day
	'2026-01-19', // Martin Luther King Jr. Day
	'2026-02-16', // Presidents' Day
	'2026-05-25', // Memorial Day
	'2026-07-04', // Independence Day
	'2026-09-07', // Labor Day
	'2026-11-11', // Veterans Day
	'2026-11-26', // Thanksgiving
	'2026-11-27', // Day after Thanksgiving
	'2026-12-25', // Christmas
];

/**
 *
 * @param {Date} date
 * @returns {{min: string|null, max: string|null, disabled: boolean}}
 */
const getOpeningHours = (date) => {
	if (CLOSED.includes(date.toISOString().split('T')[0])) {
		return { disabled: true, min: null, max: null };
	} else {
		const { opens, closes } = OPENING_HOURS[date.getDay()];

		if (typeof opens === 'string' && typeof closes === 'string') {
			return { min: opens, max: closes, disabled: false };
		} else {
			return { disabled: true, min: null, max: null };
		}
	}
};

/**
 *
 * @returns {Date}
 */
const _getDate = () => {
	const { value, ok } = attemptSync(str => {
		if (str?.length === 0) {
			return new Date();
		} else if (str?.includes('T')) {
			return new Date(str);
		} else {
			return new Date(str + 'T09:00:00');
		}
	}, date);

	return ok ? value : new Date();
};

const postalCodes = {
	'alta sierra': '95949',
	'weldon': '93283',
	'bodfish': '93205',
	'south lake': '93240',
	'mt mesa': '93240',
	'mountain mesa': '93240',
	'wofford heights': '93285',
	'lake isabella': '93240',
	'kernville': '93238',
	'onyx': '93255',
	'canebrake': '93255',
	'havilah': '93518',
	'caliente': '93518',
	'squirrel mountain valley': '93240',
	'squirrel valley': '93240',
	'keyesville': '93240',
	'keysville': '93240',
};

async function _alert(message, qr, { signal } = {}) {
	const { resolve, promise } = Promise.withResolvers();
	const dialog = document.getElementById('pantry-message');
	const qrSrc = qr instanceof Blob ? URL.createObjectURL(qr) : null;
	document.getElementById('pantry-message-content').textContent = message;

	if (typeof qrSrc === 'string') {
		document.getElementById('pantry-token-qr').replaceChildren(html`<div class="center pantry-qr">
			<img src="${qrSrc}" decoding="async" class="card qr-code" />
			<br />
			<a class="btn btn-primary" href="${qrSrc}" download="krv-pantry-qr.png">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="icon" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"/>
				</svg>
				<span>Save QR Code</span>
			</a>
		</div>`);

		dialog.addEventListener('close', () => {
			resolve();
			URL.revokeObjectURL(qrSrc);
		}, { once: true, signal });

	} else {
		dialog.addEventListener('close', resolve, { once: true, signal });
		document.getElementById('pantry-token-qr').replaceChildren();
	}

	dialog.showModal();

	await promise;
}

const TIMEZONE_OFFSET = 8 * HOURS;
// Options given on Neighbor Intake
const TOWNS = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
const ZIPS = [95949, 93240, 93283, 93205, 93285, 93238, 93255, 93518];

const dateChange = registerCallback('pantry:date:change', ({ target }) => {
	if (target.value.length !== 10) {
		target.setCustomValidity('Please select a valid date. YYYY-MM-DD format is required.');
	} else if (CLOSED.includes(target.value)) {
		target.setCustomValidity('The pantry is closed on this day.');
	} else {
		const date = new Date(target.valueAsDate.getTime() + TIMEZONE_OFFSET);
		const { min, max, disabled } = getOpeningHours(date);
		const timeInput = target.form.elements.namedItem('time');
		timeInput.disabled = disabled;

		if (disabled) {
			timeInput.value = '';
			target.setCustomValidity('The pantry is closed on this date.');
		} else {
			timeInput.value = '';
			timeInput.min = min;
			timeInput.max = max;
			target.setCustomValidity('');
		}
	}
});

const changeHandler = registerCallback('pantry:form:change', change);

const closeMessage = registerCallback('pantry:message:close', ({ target }) => target.closest('dialog').close());

const submitHandler = registerCallback('pantry:form:submit', async event => {
	event.preventDefault();
	// Store the submitter, with a default empty object just in case.
	const submitter = event.submitter ?? {};

	try {
		submitter.disabled = true;
		const data = new FormData(event.target);
		data.set('datetime', new Date(data.get('date') + 'T' + data.get('time')).toISOString());

		const resp = await fetch('/api/pantry', {
			method: 'POST',
			body: data,
		});

		if (resp.ok) {
			const body = await resp.formData();
			const message = body.get('message');
			// const token = body.get('token');
			const qr = body.get('qr');
			clearState();
			await _alert(message, qr);
			submitter.disabled = false;
			history.length > 1 ? back() : navigate('/');
		} else {
			const err = await resp.json();
			throw new Error(err.error.message);
		}
	} catch(err) {
		await _alert(err.message);
		submitter.disabled = false;
	}
});

const resetHandler = registerCallback('pantry:form:reset', () => {
	clearState();
	history.length > 1 ? back() : navigate('/');
});

const updateZip = registerCallback('pantry:form:zip-update', ({ target: { value, form } }) => {
	const val = value.toLowerCase().replaceAll(/[^A-Za-z ]/g, '');

	if (typeof postalCodes[val] === 'string') {
		form.elements.namedItem('postalCode').value = postalCodes[val];
	}
});

/**
 *
 * @param {Date} date
 * @returns {string}
 */
const getDateString = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

export default function({
	state: {
		givenName = getSearch('givenName', ''),
		additionalName = getSearch('additionalName', ''),
		familyName = getSearch('familyName', ''),
		email = getSearch('email', ''),
		telephone = getSearch('telephone', ''),
		household = getSearch('household', '1'),
		streetAddress = getSearch('streetAddress', ''),
		addressLocality = getSearch('addressLocality', ''),
		postalCode = getSearch('postalCode', ''),
		// date = _getDate(),
		time = '',
		comments = '',
	},
	signal,
}) {
	const date = _getDate();
	const sig = registerSignal(signal);
	const minDate = new Date();
	const maxDate = new Date(Date.now() + 2 * WEEKS);
	const { min, max, disabled } = getOpeningHours(date);

	return html`<form id="pantry-form" ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<div>
			<h2>KRV Bridge Choice Food Pantry</h2>
			<img srcset="https://i.imgur.com/h68vmgFt.jpeg 90w,
					https://i.imgur.com/h68vmgFm.jpeg 160w,
					https://i.imgur.com/h68vmgFl.jpeg 320w,
					https://i.imgur.com/h68vmgFh.jpeg 640w,
					https://i.imgur.com/h68vmgF.jpeg 2500w"
				class="full-width"
				sizes="(max-width: 800px) 100vw, calc(100vw - 400px)"
				width="640"
				height="482"
				src="https://i.imgur.com/h68vmgFh.jpeg"
				alt="KRV Bridge Food Pantry"
				loading="lazy"
				decoding="async"
				crossorigin="anonymous"
				referrerpolicy="no-referrer" />
			<p>The Choice Pantry is provided to KRV residents to compliment other resources to meet nutritional needs.
			As a choice pantry, it offers an experience more like shipping where guests are allowed to pick out their own
			food that they want rather than a preset box of items.
			The Choice Pantry is available up to twice per month and provides food based on household size.</p>
		</div>
		<div>
			<h3>Notice</h3>
			<p>As part of a new food program, we are required to collect some information about you and your household.</p>
			<p>There is a form for the Department of Housing and Urban Development (HUD) that we are required to collect information for.</p>
			<p>
				If you have not already done so, please print and fill out the following form and bring it with you to the pantry:
				<a href="${CARES_FORM}" download="pantry-cares-form.pdf" target="_blank" rel="noopener noreferrer" class="btn btn-outine-primary">
					<span>Download the CARES Form</span>
					<svg class="current-color icon" fill="currentColor" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
						<use xlink:href="/img/icons.svg#file-pdf"></use>
					</svg>
				</a>
			</p>
		</div>
		<fieldset class="no-border">
			<legend>Schedule an Appointment</legend>
			<p>No appointment necessary, but we would appreciate the notice to ensure someone is available to assist you.</p>
			<p class="status-box info">Fields marked with a <q>*</q> are required</p>
			<div class="form-group flex wrap space-between">
				<span>
					<label for="pantry-given-name" class="input-label required">First Name</label>
					<input type="text" name="givenName" id="pantry-given-name" class="input" placeholder="First name" autocomplete="given-name" ${attr({ value: givenName })} required="" />
				</span>
				<span>
					<label for="pantry-additional-name" class="input-label">Middle Name</label>
					<input type="text" name="additionalName" id="pantry-additional-name" class="input" placeholder="Middle name" autocomplete="additional-name" ${attr({ value: additionalName })} />
				</span>
				<span>
					<label for="pantry-given-name" class="input-label required">Last Name</label>
					<input type="text" name="familyName" id="pantry-family-name" class="input" placeholder="Last name" autocomplete="family-name" ${attr({ value: familyName })} required="" />
				</span>
			</div>
			<div class="form-group">
				<label for="pantry-email" class="input-label">Email</label>
				<input type="email" name="email" id="pantry-email" class="input" placeholder="user@example.com" autocomplete="home email" ${attr({ value: email })} />
			</div>
			<div class="form-group">
				<label for="pantry-phone" class="input-label">Phone</label>
				<input type="tel" name="telephone" id="pantry-phone" class="input" placeholder="555-555-5555" autocomplete="mobile tel" ${attr({ value: telephone })} />
			</div>
			<div class="form-group">
				<label for="pantry-street-address" class="input-label">Address</label>
				<input type="text" name="streetAddress" id="pantry-street-address" class="input" autocomplete="street-address" placeholder="Street Address" ${attr({ value: streetAddress })} />
				<label for="pantry-address-locality required" class="input-label required">City</label>
				<input type="text" name="addressLocality" id="pantry-address-locality" class="input" placeholder="Town" autocomplete="address-level2" list="pantry-towns-list" ${attr({ value: addressLocality })} ${onChange}="${updateZip}" required="" />
				<datalist id="pantry-towns-list">
					${TOWNS.map(town => `<option label="${town}" value="${town}"></option>`).join('\n')}
				</datalist>
				<label for="pantry-postal-code" class="input-label required">Zip Code</label>
				<input type="text" name="postalCode" id="pantry-postal-code" class="input" pattern="\d{5}" inputmode="numeric" minlength="5" maxlength="5" placeholder="#####" autocomplete="home postal-code" list="pantry-postal-list" ${attr({ value: postalCode })} required="" />
				<datalist id="pantry-postal-list">
					${ZIPS.map(code => `<option value="${code}" label="${code}"></option>`).join('\n')}
				</datalist>
			</div>
			<div class="form-group">
				<label for="pantry-household-size" class="input-label required">How Many People Will This Feed?</label>
				<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="8" autocomplete="off" ${attr({ value: household })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-date" class="input-label required">Pick a Date</label>
				<input type="date" name="date" id="pantry-date" class="input" min="${getDateString(minDate)}" max="${getDateString(maxDate)}" ${onChange}="${dateChange}" ${signalAttr}="${sig}" ${attr({ value: disabled ? null : date.toISOString().split('T')[0] })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-time" class="input-label required">Pick a Time</label>
				<input type="time" name="time" id="pantry-time" class="input" ${attr({ value: time, min, max, disabled })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-comments" class="input-label">
					<span>Additional Resource Request</span>
					<p>Are there any other resouces that you may be seeking? Any circumstances that our network of partners may be able to assist you with?</p>
				</label>
				<textarea name="comments" id="pantry-comments" class="input" placeholder="Is there anything else you would like to say?" cols="40" rows="5">${comments.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')}</textarea>
				<p><b>Note:</b> By adding additional comments about your needs and circumstances, you agree to allow us to share any relevant information with our partners for the purpose of connecting you with resources they may offer you.</p>
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-success btn-lg">Submit</button>
			<button type="reset" class="btn btn-danger btn-lg">Cancel</button>
		</div>
	</form>
	<dialog id="pantry-message">
		<div id="pantry-message-content"></div>
		<div id="pantry-token-qr"></div>
		<button type="button" class="btn btn-primary" ${onClick}="${closeMessage}" ${signalAttr}="${sig}">
			<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" class="icon" fill="currentColor" aria-hidden="true">
				<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
			</svg>
			<span>Close</span>
		</button>
	</dialog>`;
}

export const title = `Food Pantry - ${site.title}`;

export const description = 'KRV Bridge Connection Food Pantry - In partnership with CAPK';
