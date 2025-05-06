import { site } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onClick, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate, back } from '@aegisjsproject/router/router.js';
import { WEEKS, HOURS } from '@shgysk8zer0/consts/date.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state/state.js';
import '@aegisjsproject/md-editor';

async function _alert(message, { signal } = {}) {
	const { resolve, promise } = Promise.withResolvers();
	const dialog = document.getElementById('pantry-message');
	document.getElementById('pantry-message-content').textContent = message;
	dialog.addEventListener('close', resolve, { once: true, signal });
	dialog.showModal();

	await promise;
}

const TIMEZONE_OFFSET = 8 * HOURS;
// Options given on Neighbor Intake
const GENDERS = ['Male','Female','Transgender','Trans Female/Trans Woman','Trans Male/Trans Man','None of these','Don\'t Know / Prefer not to answer'];
const TOWNS = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
const ZIPS = [95949, 93240, 93283, 93205, 93285, 93238, 93255, 93518];

const validateWeekday = registerCallback('pantry:date:change', ({ target }) => {
	if (target.value.length > 9) {
		// Adjust for timezone
		const day = new Date(target.valueAsDate.getTime() + TIMEZONE_OFFSET).getDay();

		if (day === 0 || day === 7) {
			target.setCustomValidity('Please select a weekday [Mon-Fri].');
		} else {
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
			const { message } = await resp.json();
			clearState();
			await _alert(message);
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

/**
 *
 * @param {Date} date
 * @returns {string}
 */
const getDateString = date => `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;

export default function({
	state: {
		givenName = '',
		additionalName = '',
		familyName = '',
		gender = '',
		bDay = '',
		email = '',
		telephone = '',
		household = '1',
		streetAddress = '',
		addressLocality = '',
		postalCode = '',
		date = new Date().toISOString().split('T')[0],
		time = '',
		comments = '',
	},
	signal,
}) {
	const sig = registerSignal(signal);
	const minDate = new Date();
	const maxDate = new Date(Date.now() + 2 * WEEKS);

	return html`<form id="pantry-form" ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<h2>KRV Bridge Food Pantry</h2>
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
			<legend>Schedule an Appointment</legend>
			<p>No appointment necessary, but we would appreciate the notice to ensure someone is available to assist you.</p>
			<div class="form-group flex wrap space-between">
				<span>
					<label for="pantry-given-name" class="input-label required">First Name</label>
					<input type="text" name="givenName" id="pantry-given-name" class="input" placeholder="First name" autocomplete="given-name" ${attr({ value: givenName })} required="" />
				</span>
				<span>
					<label for="pantry-additional-name" class="input-label">Middle Name</label>
					<input type="text" name="additionalName" id="pantry-additional-name" class="input" placeholder="Middle name" autocomplete="additional-name" ${attr({ value: additionalName })} required="" />
				</span>
				<span>
					<label for="pantry-given-name" class="input-label required">Last Name</label>
					<input type="text" name="familyName" id="pantry-family-name" class="input" placeholder="Last name" autocomplete="family-name" ${attr({ value: familyName })} required="" />
				</span>
			</div>
			<div class="form-group">
				<label for="pantry-bday" class="input-label required="">Birthday</label>
				<input type="date" name="bDay" id="pantry-bday" class="input" placeholder="yyyy-mm-dd" inputmode="numeric" pattern="\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])" autocomplete="bday" ${attr({ value: bDay })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-gender required">Gender</label>
				<select name="gender" id="pantry-gender" class="input" autocomplete="sex" required="">
					<option label="Please select one"></option>
					${GENDERS.map(opt => `<option ${attr({ label: opt, value: opt, selected: opt === gender })}></option>`).join('\n')}
				</select>
			</div>
			<div class="form-group">
				<label for="pantry-email" class="input-label required">Email</label>
				<input type="email" name="email" id="pantry-email" class="input" placeholder="user@example.com" autocomplete="home email" ${attr({ value: email })} />
			</div>
			<div class="form-group">
				<label for="pantry-phone" class="input-label">Phone</label>
				<input type="tel" name="telephone" id="pantry-phone" class="input" placeholder="555-555-5555" autocomplete="mobile tel" ${attr({ value: telephone })} />
			</div>
			<div class="form-group">
				<label for="pantry-street-address" class="input-label">Address</label>
				<input type="text" name="streetAddress" id="pantry-street-address" class="input" placeholder="123 Some St." aria-label="Street Address" autocomplete="home street-address" ${attr({ value: streetAddress })} />
				<label for="pantry-address-locality required" class="input-label" hidden="">City</label>
				<input type="text" name="addressLocality" id="pantry-address-locality" class="input" placeholder="Town" autocomplete="home address-level2" list="pantry-towns-list" ${attr({ value: addressLocality })} aria-label="City/Locality" required="" />
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
				<label for="pantry-household-size" class="input-label">Household Size</label>
				<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="8" autocomplete="off" ${attr({ value: household })} required="" />
			</div>
			<div class="form-group">
				<label for="md" class="input-label">Markdown</label>
				<md-editor name="md" id="md" class="input" required=""></md-editor>
			</div>
			<div class="form-group">
				<label for="pantry-date" class="input-label required">Pick a date</label>
				<input type="date" name="date" id="pantry-date" class="input" min="${getDateString(minDate)}" max="${getDateString(maxDate)}" ${onChange}="${validateWeekday}" ${signalAttr}="${sig}" ${attr({ value: date })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-time" class="input-label required">Pick a time</label>
				<input type="time" name="time" id="pantry-time" class="input" min="09:00" max="16:00" step="900" ${attr({ value: time })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-comments" class="input-label">Comments</label>
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
		<button type="button" class="btn btn-primary" ${onClick}="${closeMessage}" ${signalAttr}="${sig}">Close</button>
	</dialog>`;
}

export const title = `Food Pantry - ${site.title}`;

export const description = 'KRV Bridge Connection Food Pantry - In partnership with CAPK';
