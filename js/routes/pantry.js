import { site, PANTRY_OPENING_HOURS } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onClick, onReset, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate, back } from '@aegisjsproject/router';
import { WEEKS, HOURS } from '@shgysk8zer0/consts/date.js';
import { clearState, setState, changeHandler as change } from '@aegisjsproject/state';
import { getSearch } from '@aegisjsproject/url/search.js';
import { attemptSync } from '@aegisjsproject/attempt';
import { konami } from '@shgysk8zer0/konami';
import { ROOT_COMMANDS } from '@aegisjsproject/commands';
import {
	HOUSEHOLD_LIST, HOUSEHOLD_MEMBER_CLASSNAME, getPantryHouseholdTemplate, pantryAddHousehold, getHouseholdSize,
	isCorrectHouseholdSize, getHouseholdSizeValue, addHouseholdMember, ADD_HOUSEHOLD_MEMBER_ID,
} from '../components/pantry.js';

const MESSAGE = 'The Emergency Choice Pantry will be closed for the Holidays from Wed Dec 26 - Fri Dec 26 and from Wed Dec 31 - Fri Jan 2.';
const ID = 'pantry-form';
const CAL_BENEFITS = 'https://benefitscal.com/';
const CARES_FORM = '/docs/cares-form.pdf';
const TIMEZONE_OFFSET = 8 * HOURS;
const TIME_STEP = 60;
// Options given on Neighbor Intake
export const TOWNS = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
export const ZIPS = [95949, 93240, 93283, 93205, 93285, 93238, 93255, 93518];

const timeFormatter = new Intl.DateTimeFormat(navigator.language, { timeStyle: 'short' });

const style = css`#pantry-message {
	max-width: min(800px, 95%);
}

#pantry-date:not(:invalid) + #pantry-date-invalid,
#pantry-time:not(:invalid) + #pantry-time-invalid {
	visibility: hidden;
}

#pantry-message .btns {
	justify-content: center;
	gap: 0.8rem;
}`;

// const print = css`@media print {
// 	@page {
// 		margin: 0;
// 		size: letter;
// 	}

// 	:root {
// 		margin: 0;
// 		max-width: 8.5in;
// 		width: 100%;
// 	}

// 	#header, #nav, #sidebar, #footer, #main > *:not(dialog) {
// 		display: none;
// 	}

// 	#pantry-message {
// 		position: fixed;
// 		top: 0;
// 		bottom: 0;
// 		left: 0;
// 		right: 0;
// 		max-width: 8.5in;
// 		width: 100%;
// 		height: 100vh;
// 		height: 100dvh;
// 		margin: 0;
// 		display: none !important;
// 	}

// 	#pantry-message p {
// 		display: none;
// 		max-width: 6in;
// 	}
// }`;

const date = getSearch('date', '');

const CLOSED = [
	'2025-08-21', // Ran empty
	'2025-08-22', // Pantry empty until Monday
	'2025-08-27', // Ran empty Wed
	'2025-08-28', // Still empty Thurs
	'2025-08-29', // Probably empty Fri too
	'2025-09-01', // Labor Day
	'2025-09-15', // Missing delivery... Ran out
	'2025-09-16', // Assume we will be out still
	'2025-09-19', // Canyon closed, so no food
	'2025-10-13', // Columbus Day
	// '2025-09-22', // Keeping closed until we know when food is coming
	'2025-11-11', // Veterans Day
	'2025-11-27', // Thanksgiving
	'2025-11-28', // Day after Thanksgiving
	'2025-12-24', // Christmas Eve
	'2025-12-25', // Christmas
	'2025-12-26', // Day after Christmas
	'2025-12-31', // New Year's Eve
	'2026-01-01', // New Year's Day
	'2026-01-02', // Day after New Year's
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
	} else if (history.state?.isAdmin) {
		const day = date.getDay();

		return day === 0 || day === 6 || Number.isNaN(day)
			? { min: null, max: null, disabled: true }
			: { min: '08:00', max: '17:00', disabled: false };
	} else {
		const { opens, closes } = PANTRY_OPENING_HOURS[date.getDay()];

		if (typeof opens === 'string' && typeof closes === 'string') {
			return { min: opens, max: closes, disabled: false };
		} else {
			return { disabled: true, min: null, max: null };
		}
	}
};

const getPantrySchedule = () => `<section class="pantry-general-hours" aria-labelledby="general-pantry-hours">
	<h3 id="general-pantry-hours">General Pantry Hours</h3>
	<p>Please be aware that this schedule does not reflect closures due to holidays or unexpected circumstances.</p>
	<ul>
		${PANTRY_OPENING_HOURS.map(({ dayOfWeek, opens, closes }) => `<li itemprop="hoursAvailable" itemtype="https://schema.org/OpeningHoursSpecification" itemscope="">
			<span itemprop="dayOfWeek">${dayOfWeek}</span>
			${typeof opens === 'string' && typeof closes === 'string' /* eslint-disable indent */
				? `<time itemprop="opens" datetime="${opens}">${timeFormatter.format(new Date(`2025-08-29T${opens}`))}</time> &mdash; <time itemprop="closes" datetime="${closes}">${timeFormatter.format(new Date(`2025-08-29T${closes}`))}</time>`
				: '<meta itemprop="opens" content="00:00" /><meta itemprop="closes" content="00:00" /><strong>Closed</strong>' /* eslint-enable indent */}
		</li>`).join('')}
	</ul>
</section>`;

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

export const postalCodes = {
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

async function _alert(message, qr, { signal, name = '', date = new Date() } = {}) {
	const { resolve, promise } = Promise.withResolvers();
	const dialog = document.getElementById('pantry-message');
	const qrSrc = qr instanceof Blob ? URL.createObjectURL(qr) : null;
	document.getElementById('pantry-message-content').textContent = message;

	if (typeof qrSrc === 'string') {
		document.querySelectorAll('.pantry-qr-dl').forEach(a => {
			a.download = `${date.toISOString()}-${name.replaceAll(/[^A-Za-z]+/g, '-')} pantry.png`;
			a.href = qrSrc;
		});

		document.getElementById('pantry-qr-img').src = qrSrc;

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

const submitHandler = registerCallback('pantry:form:submit', async event => {
	event.preventDefault();
	// Store the submitter, with a default empty object just in case.
	const submitter = event.submitter ?? {};

	try {
		submitter.disabled = true;
		const data = new FormData(event.target);

		if (! isCorrectHouseholdSize(data)) {
			addHouseholdMember();
			requestAnimationFrame(() => document.querySelector(`.${HOUSEHOLD_MEMBER_CLASSNAME}:invalid`).scrollIntoView({ behavior: 'smooth' }));
			throw new Error(`Please list all ${getHouseholdSizeValue() - 1} other members of your household.`);
		}
		const date = new Date(data.get('date') + 'T' + data.get('time'));
		data.set('datetime', date.toISOString());

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
			// print.disabled = false;
			await _alert(message, qr, { name: `${data.get('givenName')} ${data.get('familyName')}`, date });
			// print.disabled = true;
			submitter.disabled = false;
			history.length > 1 ? back() : navigate('/');
		} else {
			const err = await resp.json();
			throw new Error(err.error.message);
		}
	} catch(err) {
		alert(err.message);
		submitter.disabled = false;
	}
});

const resetHandler = registerCallback('pantry:form:reset', () => {
	clearState();
	history.length > 1 ? back() : navigate('/');
});

export const updateZip = registerCallback('pantry:form:zip-update', ({ target: { value, form } }) => {
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

document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];

export default function({
	url,
	state: {
		givenName = getSearch('givenName', ''),
		additionalName = getSearch('additionalName', ''),
		familyName = getSearch('familyName', ''),
		suffix = getSearch('suffix'),
		email = getSearch('email', ''),
		telephone = getSearch('telephone', ''),
		household = getSearch('household', ''),
		streetAddress = getSearch('streetAddress', ''),
		addressLocality = getSearch('addressLocality', ''),
		postalCode = getSearch('postalCode', ''),
		time = '',
		comments = '',
		isAdmin = false,
	},
	signal,
}) {
	const date = _getDate();
	const sig = registerSignal(signal);
	const minDate = new Date();
	const maxDate = new Date(Date.now() + 2 * WEEKS);
	const { min, max, disabled } = getOpeningHours(date);

	if (! isAdmin) {
		// Not a great solution, but need something for now...
		konami({ signal }).then(() => {
			setState('isAdmin', true);
			document.getElementById('pantry-date').setCustomValidity('');
		});
	}

	// signal.addEventListener('abort', () => print.disabled = true, { once: true });

	return html`<form id="${ID}" itemtype="https://schema.org/ContactPoint" itemscope="" ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<div>
			<h2>
				<span itemprop="name" hidden="">KRV Bridge Connection</span>
				<span itemprop="contactType">Emergency Choice Food Pantry</span>
			</h2>
			${typeof MESSAGE === 'string' ? `<div class="status-box info"><p>${MESSAGE}</p></div><br />` : '' }
			<div class="center">
				<a href="${url.pathname}#${ID}-fields" class="btn btn-primary btn-big">
					<svg width="16" height="18" fill="currentColor" class="icon animation-speed-normal animation-infinite animation-ease-in-out animation-alternate trampoline">
						<use xlink:href="/img/icons.svg#chevron-down"></use>
					</svg>
					<span>Register for your Emergency Choice Pantry Visit</span>
				</a>
			</div>
			<br />
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
				itemprop="image"
				referrerpolicy="no-referrer" />
			<p itemprop="description">The Choice Pantry is designed to provide emergency food assistance. It's for community members who are facing a
			temporary food crisis and need help filling the gaps when other resources, like SNAP benefits and food distributions,
			are not enough.</p>
			<p>As a choice pantry, it offers an experience more like shipping where guests are allowed to pick out their own
			food that they want rather than a preset box of items.
			The Choice Pantry is available up to twice within a rolling one-month period and provides food based on household size.</p>
			<p>
				Apply for food assistance in California through the official
				<a href="${CAL_BENEFITS}" class="btn btn-link" target="_blank" rel="noopener noreferrer">
					<span>CalFresh (SNAP/Food Stamps)</span>
					<svg class="icon" width="18" height="18" fill="currentColor" role="presentation" aria-hidden="true">
						<use href="/img/icons.svg#link-external"></use>
					</svg>
				</a>
				website.
			</p>
		</div>
		<section aria-labelledby="pantry-hud-notice">
			<h3 id="pantry-hud-notice">Notice</h3>
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
		</section>
		<section itemprop="address" itemtype="https://schema.org/PostalAddress" aria-labelledby="pantry-address" itemscope="">
			<meta itemprop="name" content="KRV Bridge Connection" />
			<h3 id="pantry-address">Address</h3>
			<div itemprop="streetAddress">6069 Lake Isabella Blvd.</div>
			<div>
				<span itemprop="addressLocality">Lake Isabella</span>,
				<span itemprop="addressRegion">CA</span>
				<meta itemprop="postalCode" content="93240" />
				<meta itemprop="addressCountry" content="US" />
			</div>
		</section>
		<fieldset id="${ID}-fields" class="no-border">
			<legend>Register for your Emergency Choice Pantry Visit</legend>
			<p>To ensure we can serve you, an registration is required. Using this form is the only way to see our most up-to-date hours,
			as we quickly update it to reflect any unexpected closures, such as those caused by low food inventory or other issues.</p>
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
					<label for="pantry-family-name" class="input-label required">Last Name</label>
					<input type="text" name="familyName" id="pantry-family-name" class="input" placeholder="Last name" autocomplete="family-name" ${attr({ value: familyName })} required="" />
				</span>
				<span>
					<label for="pantry-name-suffix" class="input-label">Suffix</label>
					<input type="text"
						name="suffix"
						id="pantry-name-suffix"
						class="input"
						${attr({ value: suffix })}
						autocomplete="honorific-suffix"
						list="suffix-options"
						size="3"
						minlength="2"
						placeholder="Jr., Sr., III, etc." />
					<datalist id="suffix-options">
						<option value="Jr">
						<option value="Sr">
						<option value="II">
						<option value="III">
						<option value="IV">
					</datalist>
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
				<label for="pantry-address-locality" class="input-label required">City</label>
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
				${getHouseholdSize(household)}
				<!--<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="8" inputmode="numeric" autocomplete="off" ${attr({ value: household })} required="" />-->
			</div>
			<div>
				<p>Please provide the names for all of the people other than yourself this will be feeding</p>
				<ol id="${HOUSEHOLD_LIST}" class="form-group"></ol>
				<button type="button" id="${ADD_HOUSEHOLD_MEMBER_ID}" class="btn btn-primary btn-lg" ${onClick}="${pantryAddHousehold}" ${signalAttr}="${sig}">
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" class="icon" role="presentation" aria-hidden="true">
						<path fill-rule="evenodd" d="M12 9H7v5H5V9H0V7h5V2h2v5h5v2z"/>
					</svg>
					<span>Add Household Member</span>
				</button>
			</div>
			<p>Please be aware that scheduling is limited to pantry days and hours, and visits may not be made when pantry is closed or low on food. See the <a href="${location.pathname}#general-pantry-hours">Schedule.</a></p>
			${getPantrySchedule()}
			<p>
				<span>For other KRV Food Distributions, please see the</span>
				<a href="/food/">
					<svg class="icon" width="16" height="16" fill="currentColor" role="presentation" aria-hidden="true">
						<use href="/img/icons.svg#link"></use>
					</svg>
					<span>Calendar</span>
				</a>
			</p>
			<div class="form-group">
				<label for="pantry-date" class="input-label required">Pick a Date</label>
				<input type="date" name="date" id="pantry-date" class="input" min="${getDateString(minDate)}" max="${getDateString(maxDate)}" ${onChange}="${dateChange}" ${signalAttr}="${sig}" ${attr({ value: disabled && ! isAdmin ? null : date.toISOString().split('T')[0] })} required="" />
				<div id="pantry-date-invalid">Please check <a href="${location.pathname}#general-pantry-hours" class="btn btn-link">Pantry Schedule</a></div>
			</div>
			<div class="form-group">
				<label for="pantry-time" class="input-label required">Pick a Time</label>
				<input type="time" name="time" id="pantry-time" class="input" ${attr({ value: time, min, max, disabled })} step="${TIME_STEP}" required="" />
				<div id="pantry-time-invalid">Please check <a href="${location.pathname}#general-pantry-hours" class="btn btn-link">Pantry Schedule</a></div>
			</div>
			<div class="form-group">
				<label for="pantry-comments" class="input-label">
					<span>Additional Resource Request</span>
					<p>Are there any other resouces that you may be seeking? Any circumstances that our network of partners may be able to assist you with?</p>
				</label>
				<textarea name="comments" id="pantry-comments" class="input" placeholder="Please describe any other needs or support you are looking for." cols="40" rows="5">${comments.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')}</textarea>
				<p><b>Note:</b> By adding additional comments about your needs and circumstances, you agree to allow us to share any relevant information with our partners for the purpose of connecting you with resources they may offer you.</p>
				<p>
					Looking for something specific? Our <a href="/resources/" target="_blank" class="no-router">resources directory <svg class="icon" height="18" width="18" fill="currentColor" role="presentation" aria-hidden="true"><use href="/img/icons.svg#link-external"></use></svg></a> has an extensive list of community partners and services.
				</p>
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-success btn-lg">Submit</button>
			<button type="reset" class="btn btn-danger btn-lg">Cancel</button>
		</div>
	</form>
	<dialog id="pantry-message">
		<p id="pantry-message-content"></p>
		<div id="pantry-token-qr">
			<div class="center pantry-qr">
				<a id="pantry-dl-container" class="pantry-qr-dl" download="krv-pantry-qr.png">
					<img id="pantry-qr-img" class="card qr-code" decoding="async" />
				</a>
			</div>
		</div>
		<p class="center qr-message">This QR Code is necessary to check-in to your pantry visit. <strong>Please save it</strong> and have it available when you arrive.</p>
		<div class="flex row wrap btns">
			<a id="pantry-qr-download" class="btn btn-success pantry-qr-dl" download="krv-pantry-qr.png">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="icon" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M9 12h2l-3 3-3-3h2V7h2v5zm3-8c0-.44-.91-3-4.5-3C5.08 1 3 2.92 3 5 1.02 5 0 6.52 0 8c0 1.53 1 3 3 3h3V9.7H3C1.38 9.7 1.3 8.28 1.3 8c0-.17.05-1.7 1.7-1.7h1.3V5c0-1.39 1.56-2.7 3.2-2.7 2.55 0 3.13 1.55 3.2 1.8v1.2H12c.81 0 2.7.22 2.7 2.2 0 2.09-2.25 2.2-2.7 2.2h-2V11h2c2.08 0 4-1.16 4-3.5C16 5.06 14.08 4 12 4z"/>
				</svg>
				<span>Save QR Code</span>
			</a>
			<button type="button" class="btn btn-primary" command="${ROOT_COMMANDS.print}" commandfor="doc">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="icon" fill="currentColor" aria-hidden="true">
					<path d="M2 4c-.5 0-1 .5-1 1v4c0 .5.5 1 1 1h1V8h10v2h1c.5 0 1-.5 1-1V5c0-.5-.5-1-1-1zm2-3v2h8V1z"/>
					<path d="M4 9v5h8V9z"/>
				</svg>
				<span>Print</span>
			</button>
			<button type="button" class="btn btn-secondary" command="close" commandfor="pantry-message">
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" class="icon" fill="currentColor" aria-hidden="true">
					<use href="/img/icons.svg#x"></use>
				</svg>
				<span>Close</span>
			</button>
		</div>
	</dialog>
	${getPantryHouseholdTemplate({ signal: sig })}`;
}

export const title = `Emergency Choice Food Pantry - ${site.title}`;

export const description = 'Emergenct Choice Food Pantry - In partnership with CAPK';
