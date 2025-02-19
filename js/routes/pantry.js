import { site } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate, back } from '@aegisjsproject/router/router.js';
import { WEEKS, HOURS } from '@shgysk8zer0/consts/date.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state/state.js';

const TOWNS = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
const ZIPS = [95949, 93240, 93283, 93205, 93285, 93238, 93255, 93518];

const validateWeekday = registerCallback('pantry:date:change', ({ target }) => {
	if (target.value.length > 9) {
		// Adjust for timezone
		const day = new Date(target.valueAsDate.getTime() + 8 * HOURS).getDay();

		if (day === 0 || day === 7) {
			target.setCustomValidity('Please select a weekday [Mon-Fri].');
		} else {
			target.setCustomValidity('');
		}
	}
});

const changeHandler = registerCallback('pantry:form:change', change);

const submitHandler = registerCallback('pantry:form:submit', async event => {
	event.preventDefault();

	try {
		const data = new FormData(event.target);
		const resp = await fetch('/api/pantry', {
			method: 'POST',
			body: data,
		});

		if (resp.ok) {
			const { message } = await resp.json();
			clearState();
			alert(message);
			history.length > 1 ? back() : navigate('/');
		} else {
			const err = await resp.json();
			throw new Error(err.error.message);
		}
	} catch(err) {
		alert(err.message);
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
		name = '',
		email = '',
		telephone = '',
		household = '',
		addressLocality = '',
		postalCode = '',
		date = '',
		time = '',
		comments = '',
	},
	signal,
}) {
	const sig = registerSignal(signal);
	const minDate = new Date();
	const maxDate = new Date(Date.now() + 2 * WEEKS);


	return html`<form id="pantry-form" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<div class="form-group">
				<label for="pantry-name" class="input-label required">Name</label>
				<input type="text" name="name" id="pantry-name" class="input" placeholder="Firstname Lastname" autocomplete="name" ${attr({ value: name })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-email" class="input-label required">Email</label>
				<input type="email" name="email" id="pantry-email" class="input" placeholder="user@example.com" autocomplete="email" ${attr({ value: email })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-phone" class="input-label">Phone</label>
				<input type="tel" name="telephone" id="pantry-phone" class="input" placeholder="555-555-5555" autocomplete="tel" ${attr({ value: telephone })} />
			</div>
			<div class="form-group">
				<label for="pantry-household-size" class="input-label">Household Size</label>
				<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="8" autocomplete="off" ${attr({ value: household })} required="" />
			</div>
			<div class="form-group">
				<label for="pantry-address-locality required" class="input-label">City</label>
				<input type="text" name="addressLocality" id="pantry-address-locality" class="input" placeholder="Town" autocomplete="address-level2" list="pantry-towns-list" ${attr({ value: addressLocality })} required="" />
				<datalist id="pantry-towns-list">
					${TOWNS.map(town => `<option label="${town}" value="${town}"></option>`).join('\n')}
				</datalist>
			</div>
			<div class="form-group">
				<label for="pantry-postal-code" class="input-label required">Zip Code</label>
				<input type="text" name="postalCode" id="pantry-postal-code" class="input" pattern="\d{5}" inputmode="numeric" minlength="5" maxlength="5" placeholder="#####" list="pantry-postal-list" ${attr({ value: postalCode })} required="" />
				<datalist id="pantry-postal-list">
					${ZIPS.map(code => `<option value="${code}" label="${code}"></option>`).join('\n')}
				</datalist>
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
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Reset</button>
		</div>
	</form>`;
}

export const title = `Food Pantry - ${site.title}`;

export const description = 'KRV Bridge Connection Food Pantry - In partnership with CAPK';
