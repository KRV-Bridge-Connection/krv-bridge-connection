import { createQRCode } from '@shgysk8zer0/kazoo/qr.js';
import { site } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';

const postalCodes = {
	'alta sierra': '95949',
	'weldon': '93240',
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
};

const pantryQRChange = registerCallback('pantry:qr:locality:change', ({ target: { value, form } }) => {
	const val = value.toLowerCase().replaceAll(/[^A-Za-z ]/g, '');

	if (typeof postalCodes[val] === 'string') {
		form.elements.namedItem('postalCode').value = postalCodes[val];
	}
});

const pantryQRSubmit = registerCallback('pantry:qr:submit', event => {
	event.preventDefault();
	const { promise, resolve, reject } = Promise.withResolvers();
	const controller = new AbortController();
	const { submitter, target } = event;

	try {
		submitter.disabled = true;
		const params = new URLSearchParams(new FormData(target));
		const qr = createQRCode(`https://krvbridge.org/pantry/?${params}`);
		document.getElementById('qr-container').replaceChildren(qr);
		document.getElementById('popover').showPopover();
		document.getElementById('popover').addEventListener('toggle', ({ newState }) => {
			if (newState === 'closed') {
				resolve();
				controller.abort();
				target.reset();
			}
		}, { signal: controller.signal });
	} catch(err) {
		reject(err);
		controller.abort(err);
	} finally {
		promise
			.catch(alert)
			.finally(() => submitter.disabled = false);
	}
});

export default ({ signal }) => html`<form id="pantry-qr" autocomplete="off" ${onSubmit}="${pantryQRSubmit}" ${signalAttr}="${registerSignal(signal)}">
	<fieldset class="no-border" autocomplete="off">
		<legend>Schedule an Appointment</legend>
		<div class="form-group flex wrap space-between">
			<span>
				<label for="pantry-given-name" class="input-label required">First Name</label>
				<input type="text" name="givenName" id="pantry-given-name" class="input" placeholder="First name" autocomplete="off" required="">
			</span>
			<span>
				<label for="pantry-additional-name" class="input-label">Middle Name</label>
				<input type="text" name="additionalName" id="pantry-additional-name" class="input" placeholder="Middle name" autocomplete="off">
			</span>
			<span>
				<label for="pantry-given-name" class="input-label required">Last Name</label>
				<input type="text" name="familyName" id="pantry-family-name" class="input" placeholder="Last name" autocomplete="off" required="">
			</span>
		</div>
		<div class="form-group">
			<label for="pantry-bday" class="input-label">Birthday</label>
			<input type="date" name="bDay" id="pantry-bday" class="input" placeholder="yyyy-mm-dd" inputmode="numeric" pattern="\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])" autocomplete="off">
		</div>
		<div class="form-group">
			<label for="pantry-gender required">Gender</label>
			<select name="gender" id="pantry-gender" class="input" autocomplete="off" required="">
				<option label="Please select one"></option>
				<option label="Male" value="Male"></option>
				<option label="Female" value="Female"></option>
				<option label="Transgender" value="Transgender"></option>
				<option label="Trans Female/Trans Woman" value="Trans Female/Trans Woman"></option>
				<option label="Trans Male/Trans Man" value="Trans Male/Trans Man"></option>
				<option label="None of these" value="None of these"></option>
				<option label="Don't Know / Prefer not to answer" value="Don't Know / Prefer not to answer"></option>
			</select>
		</div>
		<div class="form-group">
			<label for="pantry-email" class="input-label">Email</label>
			<input type="email" name="email" id="pantry-email" class="input" placeholder="user@example.com" autocomplete="off" />
		</div>
		<div class="form-group">
			<label for="pantry-phone" class="input-label">Phone</label>
			<input type="tel" name="telephone" id="pantry-phone" class="input" placeholder="555-555-5555" autocomplete="off">
		</div>
		<div class="form-group">
			<label for="pantry-street-address" class="input-label">Address</label>
			<input type="text" name="streetAddress" id="pantry-street-address" class="input" autocomplete="off">
			<label for="pantry-address-locality required" class="input-label required">City</label>
			<input type="text" name="addressLocality" id="pantry-address-locality" class="input" placeholder="Town" autocomplete="off" list="pantry-towns-list" ${onChange}="${pantryQRChange}" required="">
			<datalist id="pantry-towns-list">
				<option label="South Lake" value="South Lake"></option>
				<option label="Weldon" value="Weldon"></option>
				<option label="Mt Mesa" value="Mt Mesa"></option>
				<option label="Lake Isabella" value="Lake Isabella"></option>
				<option label="Bodfish" value="Bodfish"></option>
				<option label="Wofford Heights" value="Wofford Heights"></option>
				<option label="Kernville" value="Kernville"></option>
				<option label="Havilah" value="Havilah"></option>
			</datalist>
			<label for="pantry-postal-code" class="input-label required">Zip Code</label>
			<input type="text" name="postalCode" id="pantry-postal-code" class="input" pattern="\d{5}" inputmode="numeric" minlength="5" maxlength="5" placeholder="#####" autocomplete="off" list="pantry-postal-list" required="">
			<datalist id="pantry-postal-list">
				<option value="95949" label="95949"></option>
				<option value="93240" label="93240"></option>
				<option value="93283" label="93283"></option>
				<option value="93205" label="93205"></option>
				<option value="93285" label="93285"></option>
				<option value="93238" label="93238"></option>
				<option value="93255" label="93255"></option>
				<option value="93518" label="93518"></option>
			</datalist>
		</div>
		<div class="form-group">
			<label for="pantry-household-size" class="input-label required">Household Size</label>
			<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="8" autocomplete="off" value="1" required="">
		</div>
		<div class="form-group">
			<label for="pantry-household-income" class="input-label">Approximate Annual Household Income</label>
			<input type="number" name="income" id="pantry-household-income" class="input" placeholder="####" min="0" autocomplete="off" value="0">
		</div>
	</fieldset>
	<div class="flex row">
		<button type="submit" class="btn btn-success">Create QR</button>
		<button type="reset" class="btn btn-danger">Clear</button>
	</div>
</form>
<div id="popover" popover="manual">
	<div id="qr-container"></div>
	<button type="button" class="btn btn-primary" popovertarget="popover" popovertargetaction="popover">Close Popover</button>
</div>`;

export const title = site.title + ' | KRV Pantry Registration QRs' ;
export const description = 'Generate QR codes to more easily register for the pantry';
