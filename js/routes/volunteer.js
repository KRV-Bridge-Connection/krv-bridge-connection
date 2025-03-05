import { registerCallback, FUNCS } from '@aegisjsproject/callback-registry/callbacks.js';
import { signal as signalAttr, registerSignal, onChange, onSubmit, onReset, onClick, onToggle } from '@aegisjsproject/callback-registry/events.js';
import { clearState, changeHandler as change, setState } from '@aegisjsproject/state/state.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate, back } from '@aegisjsproject/router/router.js';
import { manageSearch } from '@aegisjsproject/url/search.js';
import { site } from '../consts.js';

const towns = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
const dowList = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const sizes = ['X-Small', 'Small', 'Medium', 'Large', 'XL', 'XXL', 'XXXL'];
const skillList = ['Construction', 'Food Services', 'CPR', 'Teaching', 'Sound/Music', 'Writing', 'Design/Flyers', 'Social Media'];
const interestsList = [
	'KRV Pantry', 'Manual labor', 'Working a booth', 'Event setup/teardown', 'Serving food', 'Trash pickup/cleaning',
	'Childcare', 'Transportation',
];

const allergyList = [
	'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Gluten', 'Latex',
	'Pollen', 'Dust mites', 'Animal dander', 'Insect stings', 'Mold',
];

const minAge = 13;
const today = new Date();
const youngestBday = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate(), 0, 0);

const [interestParams] = manageSearch('interests', [], { multiple: true });
const [skilsParams] = manageSearch('skills', [], { multiple: true });

const resetHandler = registerCallback('volunteer:form:reset', () => {
	clearState();
	history.length > 1 ? back() : navigate('/');
});

const yearPicker = registerCallback('volunteer:year:picker', ({ target }) => {
	if (Number.isSafeInteger(target.valueAsNumber) && target.validity.valid) {
		const bDay = document.getElementById('volunteer-bday');
		const currentDate = bDay.valueAsDate ?? new Date();
		currentDate.setFullYear(target.valueAsNumber);
		document.getElementById('volunteer-bday').value = currentDate.toISOString().split('T')[0];
		bDay.dispatchEvent(new Event('change', { cancelable: true }));

		if (bDay.showPicker instanceof Function) {
			bDay.showPicker();
		} else {
			bDay.click();
		}
	}
});

const toggleAddressVisibility = registerCallback('volunteer:toggle:address:visible', ({ currentTarget }) => {
	const container = document.getElementById('transportation-details');

	if (currentTarget.checked) {
		container.hidden = false;
		container.querySelectorAll('input').forEach(input => input.disabled = false);
	} else {
		container.hidden = true;
		container.querySelectorAll('input').forEach(input => input.disabled = true);
	}
});

const submitHandler = registerCallback('volunteer:form:submit:', event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const dialog = document.getElementById('volunteer-thanks-dialog');

	dialog.addEventListener('close', () => {
		clearState();
		navigate('/');
	}, { once: true });

	fetch(new URL('/api/volunteer', import.meta.url), {
		method: 'POST',
		body: data,
		keepalive: true,
	});

	dialog.showModal();

	setTimeout(() => dialog.close(), 10_000);
});

const changeHandler = registerCallback('volunteer:form:change', event => {
	change(event);

	if (event.target.type === 'checkbox' && event.target.matches('.btn input')) {
		const btn = event.target.closest('.btn');
		btn.classList.toggle('btn-primary', event.target.checked);
		btn.classList.toggle('btn-secondary', !event.target.checked);
	}
});

const additionalToggle = registerCallback('volunteer:additional:toggle', ({ currentTarget }) => setState('additionalExpanded', currentTarget.open));

const buttons = `<div class="flex row space-evenly">
	<button type="submit" class="btn btn-accept">
		<svg height="18" width="18" fill="currentColor" role="presentation">
			<use xlink:href="/img/icons.svg#check"></use>
		</svg>
		<span>Submit</span>
	</button>
	<button type="reset" class="btn btn-reject" ${onClick}="${FUNCS.navigate.back}">
		<svg height="18" width="18" fill="currentColor" role="presentation">
			<use xlink:href="/img/icons.svg#x"></use>
		</svg>
		<span>Cancel</span>
	</button>
</div>`;

const openOptional = registerCallback('volunteer:form:optional-open', () => document.getElementById('volunteer-optional').open = true);

function createCheckbox({ label, name, value = 'on', checked = false, id, ...attrs }) {
	return `<span class="checkbox-group btn btn-checkbox ${checked ? 'btn-primary' : 'btn-secondary' }">
		<input type="checkbox" ${attr({ name, value, checked, id, ...attrs })}  />
		<label ${attr({ for: id })}>
			<span>${label}</span>
		</label>
	</span>`;
}

export default ({
	url,
	state: {
		name = '',
		email = '',
		phone = '',
		streetAddress = '',
		addressLocality = '',
		size = '',
		emergencyName = '',
		emergencyPhone = '',
		allergies = [],
		needsTransportation = false,
		needsChildcare = false,
		bDay = '',
		interests = interestParams,
		skills = skilsParams,
		notes = '',
		newsletter = false,
		agreed = false,
		additionalExpanded = true,
		...state
	} = history.state ?? {},
	signal: sig,
} = {}) => {
	/* eslint-disable indent */
	const signal = registerSignal(sig);

	return `
		<p>Thanks for your interest in volunteering to benefit the KRV community. The following form will register you to be contacted for any volunteer opportunities in the Valley, as indicated by your answers to the questions. Please note that many questions are optional, and that required questions are indicated by a <q>*</q></p>
		<krv-events tags="volunteer" source="krv-bridge-volunteers" target="_blank">
			<span slot="title">Upcoming Volunteer Opportunities in the KRV</span>
		</krv-events>
		<form id="volunteer-form" action="/api/volunteer" method="POST" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
		<br />
		<fieldset id="volunteer-contact" class="no-border">
			<legend>Volunteer Sign-Up to help the KRV</legend>
			<div class="form-group">
				<label class="input-label required" for="volunteer-name">Name</label>
				<input type="text" name="name" id="volunteer-name" class="input" autocomplete="name" ${attr({ value: name })} placeholder="First Last" required="" />
			</div>
			<div class="form-group">
				<label class="input-label required" for="volunteer-email">Email</label>
				<input type="email" name="email" id="volunteer-email" class="input" autocomplete="email" ${attr({ value: email })} placeholder="user@example.com" required="" />
			</div>
			<div class="form-group">
				<label class="input-label required" for="volunteer-phone">Phone</label>
				<input type="tel" name="phone" id="volunteer-phone" class="input" autocomplete="tel" ${attr({ value: phone })} placeholder="555-555-5555" required="" />
			</div>
			<p>We ask for your birthday as a form of age verification, and may use it for celebrating with you as well. Volunteers must be at least ${minAge} years old.</p>
			<p><strong>Note</strong>: There is year-picker to help enter your birthday on mobile.</p>
			<div class="form-group">
				<label class="block">
					<span>Pick birth year</span>
					<input type="number" class="input" ${onChange}="${yearPicker}" ${signalAttr}="${signal}" max="${youngestBday.getFullYear()}" min="${youngestBday.getFullYear() - 100}" placeholder="YYYY" />
				</label>
				<label for="volunteer-bday" class="input-label required">Birthday</label>
				<input type="date" name="bDay" id="volunteer-bday" class="input" placeholder="YYYY-MM-DD" autocomplete="bday" ${attr({ value: bDay, max: youngestBday.toISOString().split('T')[0] })} required="" />
			</div>
		</fieldset>
		<fieldset id="volunteer-additional" class="no-border">
			<legend>Additional Info</legend>
			<div>
				<div class="form-group">
					${createCheckbox({ label: 'I may require childcare', name: 'needsChildcare', checked: needsChildcare, id: 'volunteer-need-childcare' })}
				</div>
				<p>Do you have any needs or restrictions? How can we help you serve the community?</p>
				<div class="form-group">
					${createCheckbox({ label: 'I may require transportation', name: 'needsTransportation', checked: needsTransportation, id: 'volunteer-need-transportation', [onChange]: toggleAddressVisibility, [signalAttr]: signal })}
				</div>
				<div id="transportation-details" ${attr({ hidden: ! needsTransportation })}>
					<p>If you require transportation, we will need to know your address.</p>
					<div class="form-group">
						<label class="input-label" for="volunteer-street-address">Street Address</label>
						<input type="text" name="streetAddress" id="volunteer-street-address" class="input" autocomplete="street-address" ${attr({ value: streetAddress })} placeholder="123 Some St" ${attr({ disabled: ! needsTransportation })} />
					</div>
					<datalist id="towns-list">${towns.map(town => `<option ${attr({ label: town, value: town })}></option>`)}</datalist>
					<div class="form-group">
						<label class="input-label" for="volunteer-town">City/Town</label>
						<input type="text" name="addressLocality" id="volunteer-town" class="input" list="towns-list" autocomplete="address-level2" ${attr({ value: addressLocality })} placeholder="City/Town" ${attr({ disabled: ! needsTransportation })} />
					</div>
				</div>
			</div>
			<div class="form-group">
				<label for="volunteer-notes" class="input-label">Additional Notes/Comments</label>
				<textarea name="notes" id="volunteer-notes" class="input" placeholder="Anything else you want to tell us?" rows="5">${notes}</textarea>
			</div>
			<div class="form-group">
				<p>You may optionally subscribe to an upcoming newsletter so that you may be informed of any upcoming volunteer opportunities in the KRV, including those we do not specifically contact you for.</p>
				${createCheckbox({ label: 'Subscribe to our newsletter', name: 'newsletter', checked: newsletter, id: 'volunteer-newsletter' })}
				<button type="button" class="btn btn-info" aria-label="Show Volunteer Agreement" ${onClick}="${FUNCS.ui.showModal}" data-show-modal-selector="#volunteer-terms" ${signalAttr}="${signal}">
					<span>View Volunteer Agreement</span>
				</button>
				${createCheckbox({ label: 'I agree to the terms', name: 'agreed', checked: agreed, required: true, id: 'volunteer-agreed' })}
			</div>
		</fieldset>
		<p class="status-box info">Got a few more minutes? The details below help us find your perfect volunteer matches. Tell us about your interests, skills, and availability.</p>
		<a class="btn btn-primary" href="${url.pathname}#volunteer-optional" ${onClick}="${openOptional}">
			<svg class="icon" height="18" width="18" fill="currentColor" role="presentation" aria-hidden="true">
				<use xlink:href="/img/icons.svg#info"></use>
			</svg>
			<span>Help us Match you Better</span>
		</a>
		<div>
			<br />
			${buttons}
		</div>
		<br />
		<details id="volunteer-optional" class="accordion" ${attr({ open: additionalExpanded })} ${onToggle}="${additionalToggle}" ${signalAttr}="${signal}">
			<summary>Optional Additional Questions</summary>
			<p>The following questions are optional, but will be helpful in letting us better match you to requests for volunteers.</p>
			<fieldset id="volunteer-availability" class="no-border">
				<legend>Availability</legend>
				<div class="form-group">
					<p>Please estimate your weekly availability</p>
					${dowList.map(day => `<div class="day-group">
							<label for="volunteer-${day}-start" aria-label="${day} start time">${day[0].toUpperCase() + day.substring(1)}</label>
							<input type="time" id="volunteer-${day}-start" name="${day}[start]" step="60" ${attr({ value: state[day + '[start]' ]})} />
							<label for="volunteer-${day}-end" aria-label="${day} end time">&mdash;</span>
							<input type="time" id="volunteer-${day}-end" name="${day}[end]" step="60" ${attr({ value: state[day + '[end]' ]})} />
						</div>`).join('\n')}
				</div>
				<div class="form-group">
					<p>Please Select anything you are interested in Volunteering for</p>
					<div class="flex row wrap">
						${interestsList.map(opt => createCheckbox({ label: opt, name: 'interests', value: opt, checked: interests.includes(opt), id: `interest-${opt}` })).join('')}
					</div>
				</div>
				<div class="form-group">
					<p>Please check any special skills you have to offer</p>
					<div class="flex row wrap">
						${skillList.map(opt => createCheckbox({ label: opt, name: 'skills', value: opt, checked: skills.includes(opt), id: `skill-${opt}` })).join('')}
					</div>
				</div>
			</fieldset>
			<fieldset id="volunteer-emergency-contact" class="no-border">
				<legend>Emergency Contact &amp; Health Info</legend>
				<div class="form-group">
					<label for="volunteer-emergency-name" class="form-group">Name</label>
					<input type="text" name="emergencyName" id="volunteer-emergency-name" class="input" autocomplete="off" ${attr({ value: emergencyName })} placeholder="Emergency Contact Name" />
				</div>
				<div class="form-group">
					<label for="volunteer-emergency-phone" class="form-group">Emergency Phone</label>
					<input type="tel" name="emergencyPhone" id="volunteer-emergency-phone" class="input" autocomplete="off" ${attr({ value: emergencyPhone })} placeholder="555-555-5555" />
				</div>
				<div class="form-group">
					<p>Do you have any allergies? We may need to know about allergies for any food served to volunteers, as well as to not ask you to volunteer at an event that might put you at risk.</p>
					<div class="flex row wrap">
						${allergyList.map(opt => createCheckbox({ label: opt, name: 'allergies', value: opt, checked: allergies.includes(opt), id: `allergy-${opt}` })).join('')}
					</div>
				</div>
				<div class="form-group">
					<p>Shirts may be required to identify those serving at an event, and we also hope to create custom shirts for our group of volunteers soon.</p>
					<label class="input-label" for="volunteer-size" class="input-label">Shirt Size</label>
					<select name="size" id="volunteer-size" class="input">
						<option label="Please select your shirt size" value=""></option>
						${sizes.map(opt => `<option ${attr({ label: opt, value: opt, selected: size === opt })}></option>`)}
					</select>
				</div>
			</fieldset>
			<br />
			${buttons}
		</details>
	</form>
	<dialog id="volunteer-thanks-dialog">
		<div class="clearfix">
			<button type="button" class="btn btn-reject float-right" ${onClick}="${FUNCS.ui.closeModal}" data-close-modal-selector="#volunteer-thanks-dialog" title="Close" ${signalAttr}="${signal}">
				<svg height="18" width="18" fill="currentColor">
					<use xlink:href="/img/icons.svg#x"></use>
				</svg>
			</button>
		</div>
		<p>Thank you for signing up to volunteer.</p>
	</dialog>
	<dialog id="volunteer-terms">
		<div class="clearfix">
			<button type="button" class="btn btn-reject float-right" ${onClick}="${FUNCS.ui.closeModal}" data-close-modal-selector="#volunteer-terms" aria-label="Close" ${signalAttr}="${signal}">
				<svg height="18" width="18" fill="currentColor" role="presentation">
					<use xlink:href="/img/icons.svg#x"></use>
				</svg>
			</button>
		</div>
		<h3>Volunteer Agreement</h3>
		<p>Thank you for your interest in supporting our community through volunteering! By signing up, you agree to the following terms:</p>
		<ol>
			<li>
				<strong>Use of Information</strong>
				<p>Your contact information will be used solely for the purpose of contacting you about volunteer opportunities.</p>
			</li>
			<li>
				<strong>Information Sharing</strong>
				<p>Your information may be shared with other local nonprofit organizations to help match you with appropriate volunteer opportunities. We will only share your information with organizations that align with our mission to serve the community effectively.</p>
			</li>
			<li>
				<strong>Community Volunteer List</strong>
				<p>This is a shared volunteer list for the benefit of the entire community. It is not the exclusive volunteer list of KRV Bridge Connection but rather a resource for nonprofits across the area to connect with willing and capable volunteers.</p>
			</li>
			<li>
				<strong>Confidentiality</strong>
				<p>Your personal information will not be sold, used for commercial purposes, or shared outside of trusted nonprofit organizations within our community network.</p>
			</li>
		</ol>
		<label class="btn btn-primary" for="volunteer-agreed" ${onClick}="${FUNCS.ui.closeModal}" data-close-modal-selector="#volunteer-terms" ${signalAttr}="${signal}">Accept</label>
		<button type="reset" form="volunteer-form" class="btn btn-reject" ${onClick}="${FUNCS.navigate.back}" ${signalAttr}="${signal}">Reject</button>
	</dialog>`;
};

export const title = () => 'Volunteer in the KRV | ' + site.title;

export const description = () => 'Sign-up to be contacted about multiple volunteer opportunities around the Kern River Valley.';
