import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state/state.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { getLocation } from '@shgysk8zer0/kazoo/geo.js';
import { SLACK } from '/js/consts.js';
const changeHandler = registerCallback('contact:change', change);

const getIcon = (icon, {
	width = 18,
	height = 18,
	fill = 'currentColor',
} = {}) => `<svg width="${width}" height="${height}" fill="${fill}" class="icon" role="presentation" aria-hidden="true">
	<use href="/img/icons.svg#${icon}"></use>
</svg>`;

const geo = registerCallback('contact:geo', async ({ currentTarget }) => {
	currentTarget.disabled = true;

	try {
		const { coords } = await getLocation({ enableHighAccuracy: true });

		if (typeof coords?.latitude === 'number') {
			const result = document.createElement('div');
			document.getElementById('contact-latitude').value = coords.latitude;
			document.getElementById('contact-longitude').value = coords.longitude;
			result.textContent = `Your location has been added. [${coords.latitude}, ${coords.longitude}]`;
			currentTarget.replaceWith(result);
		} else {
			throw new TypeError('Geo Coordinates are invalid.');
		}
	} catch(err) {
		reportError(err);
		currentTarget.disabled = false;
	}
});

const submit = registerCallback('contact:submit', async event => {
	event.preventDefault();
	const target = event.target;
	const data = new FormData(target);

	const HTMLNotification = customElements.get('html-notification');

	try {
		const resp = await fetch('/api/slack', {
			method: 'POST',
			referrerPolicy: 'origin',
			headers: {
				Authorization: `Bearer ${new TextDecoder().decode(SLACK)}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: data.get('name'),
				email: data.get('email'),
				phone: data.get('telephone'),
				subject: data.get('subject'),
				body: data.get('body'),
				location: {
					address: data.has('addressLocality') ? {
						streetAddress: data.get('streetAddress'),
						addressLocality: data.get('addressLocality'),
						postalCode: data.get('postalCode'),
					} : undefined,
					geo: data.has('latitude') && data.has('longitude') ? {
						latitude: parseFloat(data.get('latitude')),
						longitude: parseFloat(data.get('longitude')),
					} : undefined
				}
			})
		});

		if (resp.ok) {
			clearState();

			const notification = new HTMLNotification('Message Sent!', {
				body: 'Your message has been sent.',
				icon: '/img/icon-32.png',
				requireInteraction: true,
				actions: [
					{ title: 'Go to Home Page', action: 'home' },
					{ title: 'Dismiss', action: 'dismiss' },
				]
			});

			notification.addEventListener('notificationclick', event => {
				switch(event.action) {
					case 'dismiss':
						event.target.close();
						target.reset();
						break;

					case 'home':
						location.href = '/';
						break;
				}
			});

			requestAnimationFrame(() => notification.hidden = false);

			target.reset();
		} else if (resp.headers.get('Content-Type').startsWith('application/json')) {
			const { error } = await resp.json();

			if ( typeof error?.message === 'string') {
				throw new Error(error.message);
			} else {
				throw new Error('Oops. Something went wrong sending the message.');
			}
		} else {
			throw new Error('Message not sent.');
		}
	} catch(err) {
		console.error(err);

		const notification = new HTMLNotification('Error Sending Message', {
			body: err.message,
		});

		requestAnimationFrame(() => notification.hidden = false);
	}
});

export default ({
	signal,
	url,
	state: {
		name = null,
		email = null,
		telephone = null,
		streetAddress = null,
		addressLocality = null,
		postalCode = null,
		subject = null,
		body = null,
	} = {}
}) => {
	const sig = registerSignal(signal);
	const params = url.searchParams;

	return html`<form id="contact-form" class="no-router" ${onSubmit}="${submit}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<div class="form-group">
				<label for="contact-name" class="input-label required">
					${getIcon('avatar-default')}
					<span class="label-text">Name</span>
				</label>
				<input type="text" id="contact-name" class="input" name="name" placeholder="Firstname Lastname" autocomplete="name" ${attr({ value: name })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-email" class="input-label required">
					${getIcon('mail')}
					<span class="label-text">Email</span>
				</label>
				<input type="email" id="contact-email" class="input" name="email" placeholder="user@example.com" autocomplete="email" ${attr({ value: email })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-phone" class="input-label">
					${getIcon('call-start')}
					<span class="label-text">Phone</span>
				</label>
				<input type="tel" id="contact-phone" class="input" name="telephone" placeholder="555-555-5555" autocomplete="tel" ${attr({ value: telephone })} />
			</div>
			<div>
				<p>An address helps us reach you for services like pick-ups or deliveries. If you don't have a traditional address, please click the <q>Add Geo Coordinates</q> button. This allows assist someone in finding you if necessary to provide services.</p>
				<div class="form-group">
					<label for="contact-street-address" class="input-label">Address</label>
					<input type="text" name="streetAddress" id="contact-street-address" class="input" autocomplete="street-address" placeholder="123 Some St." ${attr({ value: streetAddress })} />
					<div class="flex row">
						<label>
							<input type="text" name="addressLocality" class="input inline-block" aria-label="City or Town" placeholder="City or Town" list="contact-towns-list" autocomplete="address-level2" ${attr({ value: addressLocality })} />
							<datalist id="contact-towns-list">
								<option label="Lake Isabella" value="Lake Isabella"></option>
								<option label="Bodfish" value="Bodfish"></option>
								<option label="Wofford Heights" value="Wofford Heights"></option>
								<option label="Mt Mesa" value="Mt Mesa"></option>
								<option label="South Lake" value="South Lake"></option>
								<option label="Weldon" value="Weldon"></option>
								<option label="Onyx" value="Onyx"></option>
								<option label="Kernville" value="Kernville"></option>
								<option label="Canebrake" value="Canebrake"></option>
								<option label="Havilah" value="Havilah"></option>
								<option label="Caliente" value="Caliente"></option>
								<option label="Alta Sierra" value="Alta Sierra"></option>
								<option label="Riverkern" value="Riverkern"></option>
								<option label="Roads End" value="Roads End"></option>
								<option label="Johnsondale" value="Johnsondale"></option>
							</datalist>
						</label>
						<span aria-hidden="true">,</span>
						<label>
							<input type="text" name="postalCode" class="input inline-block" aria-label="Zip Code" inputmode="numeric" pattern="[0-9]{5,}" minlength="5" placeholder="#####" autocomplete="postal-code" ${attr({ value: postalCode })} />
						</label>
					</div>
				</div>
				<button type="button" id="contact-coordinates" class="btn btn-primary" ${onClick}="${geo}" ${signalAttr}="${sig}">Add Geo Coordinates</button>
				<input type="hidden" name="latitude" id="contact-latitude" readonly="" />
				<input type="hidden" name="longitude" id="contact-longitude" readonly="" />
			</div>
			<div class="form-group">
				<label for="contact-subject" class="input-label required">
					<span class="label-text">Subject</span>
				</label>
				<input type="text" id="contact-subject" class="input" name="subject" placeholder="A Subject from your Message" autocomplete="off" ${attr({ value: subject ?? params.get('subject') })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-body" class="input-label required">
					${getIcon('comment')}
					<span class="label-text">Message</span>
				</label>
				<textarea id="contact-body" name="body" class="input" rows="5" placeholder="Enter your Message" ${attr({ value: body ?? params.get('body') })} required=""></textarea>
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-accept">
				${getIcon('check')}
				<span>Send</span>
			</button>
		</div>
	</form>`;
};
