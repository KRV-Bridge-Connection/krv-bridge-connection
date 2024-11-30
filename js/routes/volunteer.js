import { registerCallback, FUNCS } from '@aegisjsproject/callback-registry/callbacks.js';
import { signal as signalAttr, onChange, onSubmit, onReset, onClick, onKeydown } from '@aegisjsproject/callback-registry/events.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state/state.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { navigate } from '@aegisjsproject/router/router.js';

const towns = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
const sizes = ['X-Small', 'Small', 'Medium', 'Large', 'XL', 'XXL', 'XXXL'];
const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeList = ['Morning (6AM-11AM)', 'Afternoon (12PM-4PM)', 'Evening (5PM-9PM)'];
const skillList = ['Construction', 'Food Services', 'CPR', 'Teaching', 'Sound/Music', 'Writing', 'Design/Flyers', 'Social Media'];
const interestsList = ['Manual labor', 'Working a booth', 'Event setup/teardown', 'Serving food', 'Trash pickup/cleaning'];
const alergyList = [
	'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish', 'Gluten', 'Latex',
	'Pollen', 'Dust mites', 'Animal dander', 'Insect stings', 'Mold',
];

const checked = `<svg height="18" width="18" fill="currentColor" role="presentation" class="when-checked">
	<use xlink:href="/img/icons.svg#check"></use>
</svg>`;

const unchecked = `<svg height="18" width="18" fill="currentColor" role="presentation" class="when-unchecked">
	<use xlink:href="/img/icons.svg#x"></use>
</svg>`;

const minAge = 13;
const today = new Date();
const youngestBday = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate(), 0, 0);

const resetHandler = registerCallback('volunteer:form:reset', clearState);
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

const checkedToggle = registerCallback('aegis:label:toggle', ({ target }) => {
	if (target.checked) {
		target.labels.forEach(label => label.setAttribute('aria-checked', 'true'));
	} else {
		target.labels.forEach(label => label.setAttribute('aria-checked', 'false'));
	}
});

const triggerClick = registerCallback('aegis:click:trigger', event => {
	if (event.key === ' ' || event.key === 'Enter') {
		event.preventDefault();
		event.target.click();
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

	fetch('/api/volunteer', {
		method: 'POST',
		body: data,
		keepalive: true,
	});

	dialog.showModal();

	setTimeout(() => dialog.close(), 10_000);
});

const changeHandler = registerCallback('volunteer:form:change', change);

export default ({
	state: {
		name = '',
		email = '',
		phone = '',
		streetAddress = '',
		addressLocality = '',
		size = '',
		days = [],
		times = [],
		emergencyName = '',
		emergencyPhone = '',
		allergies = [],
		needsTransportation = false,
		needsChildcare = false,
		bDay = '',
		interests = [],
		skills = [],
		notes = '',
		hours = NaN,
		newsletter = false,
		agreed = false,
	},
	signal,
}) => html`<form id="volunteer-form" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
	<div class="status-box info">
		<p>Thank you for your interest in volunteering in the the KRV! Please provide us with the following infomation so we may best utilize your services.</p>
		<p>Please be aware that, but submitting this form, you are agreeing to being contacted for any future volunteer opportinities, not for any specific event.</p>
	</div>
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
		<div class="form-group">
			<label class="input-label" for="volunteer-street-address">Street Address</label>
			<input type="text" name="streetAddress" id="volunteer-street-address" class="input" autocomplete="street-address" ${attr({ value: streetAddress })} placeholder="123 Some St" />
		</div>
		<div class="form-group">
			<label class="input-label required" for="volunteer-town">City/Town</label>
			<input type="text" name="addressLocality" id="volunteer-town" class="input" list="towns-list" autocomplete="address-level2" ${attr({ value: addressLocality })} placeholder="City/Town" required="" />
		</div>
		<datalist id="towns-list">${towns.map(town => `<option ${attr({ label: town, value: town })}></option>`)}</datalist>
	</fieldset>
	<fieldset id="volunteer-availability" class="no-border">
		<legend>Availability</legend>
		<div class="form-group">
			<p>Please select the days you are likely to be available.</p>
			<div class="flex row wrap">
				${daysList.map(opt => `<span class="checkbox-group">
					<input type="checkbox" name="days" ${attr({
						value: opt,
						checked: days.includes(opt),
						id: `day-${opt}`,
					})} ${onChange}="${checkedToggle}" hidden="" />
					<label class="btn btn-toggle" ${attr({ for: `day-${opt}`, 'aria-label': opt, 'aria-checked': days.includes(opt) ? 'true' : 'false' })} ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0">
						<span>${opt}</span>
						${checked}${unchecked}
					</label>
				</span>`).join('')}
			</div>
		</div>
		<p>Please select the times of day you are likely to be available.</p>
		<div class="form-group">
			<div class="flex row wrap">
				${timeList.map(opt => `<span class="checkbox-group">
					<input type="checkbox" name="times" ${attr({
						value: opt,
						checked: times.includes(opt),
						id: `time-${opt}`,
					})} ${onChange}="${checkedToggle}" hidden="" />
					<label class="btn btn-toggle" ${attr({ for: `time-${opt}`, 'aria-label': opt, 'aria-checked': times.includes(opt) ? 'true' : 'false' })} ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0">
						<span>${opt}</span>
						${checked}${unchecked}
					</label>
				</span>`).join('')}
			</div>
		</div>
		<div class="form-group">
			<label for="volunteer-hours" class="input-label">Estimated Hours Available</label>
			<input type="number" name="hours" id="volunteer-hours" class="input" min="0" max="8" placeholder="##" ${attr({ value: hours })} />
		</div>
		<div class="form-group">
			<p>Please Select anything you are interested in Volunteering for</p>
			<div class="flex row wrap">
			${interestsList.map(opt => `<span class="checkbox-group">
				<input type="checkbox" name="interests" ${attr({
					value: opt,
					checked: interests.includes(opt),
					id: `interest-${opt}`,
				})} ${onChange}="${checkedToggle}" hidden="" />
				<label class="btn btn-toggle" ${attr({ for: `interest-${opt}`, 'aria-label': opt, 'aria-checked': interests.includes(opt) ? 'true' : 'false' })} ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0">
					<span>${opt}</span>
					${checked}${unchecked}
				</label>
			</span>`).join('')}
			</div>
		</div>
		<div class="form-group">
			<p>Please check any special skills you have to offer</p>
			<div class="flex row wrap">
				${skillList.map(opt => `<span class="checkbox-group">
					<input type="checkbox" name="skills" ${attr({
						value: opt,
						checked: skills.includes(opt),
						id: `skill-${opt}`,
					})} ${onChange}="${checkedToggle}" hidden="" />
					<label class="btn btn-toggle" ${attr({ for: `skill-${opt}`, 'aria-label': opt, 'aria-checked': skills.includes(opt) ? 'true' : 'false' })} ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0">
						<span>${opt}</span>
						${checked}${unchecked}
					</label>
			</span>`).join('')}
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
			<label for="volunteer-emergency-phone" class="input-group">Emergency Phone</label>
			<input type="tel" name="emergencyPhone" id="volunteer-emergency-phone" class="input" autocomplete="off" ${attr({ value: emergencyPhone })} placeholder="555-555-5555" />
		</div>
		<div class="form-group">
			<p>Do you have any allergies? We may need to know about allergies for any food served to volunteers, as well as to not ask you to volunteer at an event that might put you at risk.</p>
			<div class="flex row wrap">
				${alergyList.map(opt => `<span class="checkbox-group">
					<input type="checkbox" name="allergies" ${attr({
						value: opt,
						checked: allergies.includes(opt),
						id: `allergy-${opt}`,
					})} ${onChange}="${checkedToggle}" hidden="" />
					<label class="btn btn-toggle" ${attr({ for: `allergy-${opt}`, 'aria-label': opt, 'aria-checked': allergies.includes(opt) ? 'true' : 'false' })} ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0">
						<span>${opt}</span>
						${checked}${unchecked}
					</label>
				</span>`).join('')}
			</div>
		</div>
	</fieldset>
	<fieldset id="volunteer-additional" class="no-border">
		<legend>Additional Info</legend>
		<p>We ask for your birthday as a form of age verification, and may use it for celebrating with you as well. Volunteers must be at least ${minAge} years old.</p>
		<p><strong>Note</strong>: There is year-picker to help enter your birthday on mobile.</p>
		<div class="form-group">
			<label class="block">
				<span>Pick birth year</span>
				<input type="number" class="input" ${onChange}="${yearPicker}" max="${youngestBday.getFullYear()}" min="${youngestBday.getFullYear() - 100}" placeholder="YYYY" />
			</label>
			<label for="volunteer-bday" class="input-label">Birthday</label>
			<input type="date" name="bDay" id="volunteer-bday" class="input" placeholder="YYYY-MM-DD" autocomplete="bday" ${attr({ value: bDay, max: youngestBday.toISOString().split('T')[0] })} />
		</div>
		<div class="form-group">
			<p>Shirts may be required to identify those serving at an event, and we also hope to create custom shirts for our group of volunteers soon.</p>
			<label class="input-label required" for="volunteer-size" class="input-label">Shirt Size</label>
			<select name="size" id="volunteer-size" class="input" required="">
				<option label="Please select your shirt size" value=""></option>
				${sizes.map(opt => `<option ${attr({ label: opt, value: opt, selected: size === opt })}></option>`)}
			</select>
		</div>
		<div>
			<p>Do you have any needs or restrictions? How can we help you serve the community?</p>
			<div class="form-group">
				<input type="checkbox" name="needsTransportation" id="volunteer-need-transportation" ${attr({ checked: needsTransportation })} ${onChange}="${checkedToggle}" hidden="" />
				<label for="volunteer-need-transportation" class="btn btn-toggle" tabindex="0" role="checkbox" aria-label="I may required transportation" aria-checked="${needsTransportation ? 'true' : 'false'}" ${onKeydown}="${triggerClick}">
					<span>I may require Transportation</span>
					${checked}${unchecked}
				</label>
			</div>
			<div class="form-group">
				<input type="checkbox" name="needsChildcare" id="volunteer-need-childcare" ${attr({ checked: needsChildcare })} ${onChange}="${checkedToggle}" hidden="" />
				<label for="volunteer-need-childcare" class="btn btn-toggle" tabindex="0" role="checkbox" aria-label="I may require childcare" aria-checked="I may require childcare" aria-checked="${needsChildcare ? 'true' : 'false'}" ${onKeydown}="${triggerClick}">
					<span>I may require Childcare</span>
					${checked}${unchecked}
				</label>
			</div>
		<div class="form-group">
			<label for="volunteer-notes" class="input-label">Additional Notes/Comments</label>
			<textarea name="notes" id="volunteer-notes" class="input" placeholder="Anything else you want to tell us?" rows="5">${notes}</textarea>
		</div>
		<div class="form-group">
			<p>You may optionally subscribe to an upcoming newsletter so that you may be informed of any upcoming volunteer opportunities in the KRV, including those we do not specifically contact you for.</p>
			<input type="checkbox" name="newsletter" id="volunteer-newsletter" ${attr({ checked: newsletter })} ${onChange}="${checkedToggle}" hidden="" />
			<label for="volunteer-newsletter" class="btn btn-toggle" role="checkbox" tabindex="0" aria-label="Subscribe to our newsletter" aria-checked="${newsletter ? 'true' : 'false' }" ${onKeydown}="${triggerClick}">
				<span>Subscribe to our Newsletter</span>
				${checked}${unchecked}
			</label>
		</div>
		<div class="form-group">
			<button type="button" class="btn btn-info" aria-label="Show Volunteer Agreement" ${onClick}="${FUNCS.ui.showModal}" data-show-modal-selector="#volunteer-terms" ${signalAttr}="${signal}">
				<span>View Volunteer Agreement</span>
			</button>
			<br />
			<input type="checkbox" name="agreed" id="volunteer-agreed"  ${attr({ checked: agreed })} ${onChange}="${checkedToggle}" required="" hidden="" />
			<label for="volunteer-agreed" tabindex="0" class="btn btn-toggle required" ${onKeydown}="${triggerClick}" role="checkbox" tabindex="0" aria-label="Agree to terms" aria-checked="${agreed ? 'true' : 'false' }">
				<span>Agree to be Contacted for Volunteer Opportunities</span>
				${checked}${unchecked}
			</label>
		</div>
	</fieldset>
	<div class="flex row space-evenly">
		<button type="submit" class="btn btn-accept">
			<svg height="18" width="18" fill="currentColor" role="presentation">
				<use xlink:href="/img/icons.svg#check"></use>
			</svg>
			<span>Submit</span>
		</button>
		<button type="reset" class="btn btn-reject" ${onClick}="${FUNCS.navigate.back}">
			<svg height="18" width="18" fill="currentColor">
				<use xlink:href="/img/icons.svg#x"></use>
			</svg>
			<span>Cancel</span>
		</button>
	</div>
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
</form>
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

export const title = () => 'Volunteer in the KRV';

export const description = () => 'Sign-up to be contacted about multiple volunteer opportunities around the Kern River Valley.';
