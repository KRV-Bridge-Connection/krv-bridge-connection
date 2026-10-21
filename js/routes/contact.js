import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { clearState, changeHandler as change } from '@aegisjsproject/state';
import { attr } from '@aegisjsproject/core/stringify.js';
import { escapeHTML } from '@aegisjsproject/escape/html.js';
import { SLACK } from '/js/consts.js';
import { site } from '../consts.js';

const changeHandler = registerCallback('contact:change', change);

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
					address: undefined,
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
		subject = null,
		body = null,
	} = {}
}) => {
	const sig = registerSignal(signal);
	const params = url.searchParams;

	return html`<section id="pre-contact-info" aria-labelledby="pre-contact-info-header">
		<h2 id="pre-contact-info-header">Before you send a message:</h2>
		<ul>
			<li><strong>Have a question?</strong> Find quick answers immediately on our <a href="/faq/">FAQ Page</a>.</li>
			<li><strong>Trying to reach a partner or tenant?</strong> Please find their direct information on our <a href="/partners/">Partners Page</a>.</li>
		</ul>
	</section>
	<form id="contact-form" class="no-router" ${onSubmit}="${submit}" ${onChange}="${changeHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<div class="form-group">
				<label for="contact-name" class="input-label required">
					<span class="label-text">Name</span>
				</label>
				<input type="text" id="contact-name" class="input" name="name" placeholder="Firstname Lastname" autocomplete="name" ${attr({ value: name })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-email" class="input-label required">
					<span class="label-text">Email</span>
				</label>
				<input type="email" id="contact-email" class="input" name="email" placeholder="user@example.com" autocomplete="email" ${attr({ value: email })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-phone" class="input-label">
					<span class="label-text">Phone</span>
				</label>
				<input type="tel" id="contact-phone" class="input" name="telephone" placeholder="555-555-5555" autocomplete="tel" ${attr({ value: telephone })} />
			</div>
			<div class="form-group">
				<label for="contact-subject" class="input-label required">
					<span class="label-text">Subject</span>
				</label>
				<input type="text" id="contact-subject" class="input" name="subject" placeholder="A Subject from your Message" autocomplete="off" ${attr({ value: subject ?? params.get('subject') })} required="" />
			</div>
			<div class="form-group">
				<label for="contact-body" class="input-label required">
					<span class="label-text">Message</span>
				</label>
				<p>Please do not share any sensitive information.</p>
				<textarea id="contact-body" name="body" class="input" rows="5" placeholder="Enter your Message" required="">${escapeHTML(body ?? params.get('body'))}</textarea>
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-accept">
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" fill="currentColor" class="icon" viewBox="0 0 12 16" role="presentation" aria-hidden="true">
					<path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
				</svg>
				<span>Send</span>
			</button>
		</div>
	</form>
	<section id="fallback-contact">
		<p>If you cannot use the form above to reach KRV Bridge Connection directly, you can <a href="tel:+1-661-432-2042">call our office at (661)&nbsp;432-2042</a>.</p>
		<p><em>Please note: We will not be able to transfer you to any of our partners. If you are calling for information about a partner or their services, please contact them directly. You can find their contact info on our <a href="/partners/">Parnters Page</a>.</em></p>
	</section>`;
};

export const title = `Contact | ${site.title}`;
export const description = 'Contact page for KRV Bridge Connection';
export const styles = [css`
	#pre-contact-info {
		background-color: #f8f9fa;
		color: #242424;
		padding: 1.5rem;
		border-left: 5px solid var(--primary-color, #0056b3);
		margin-bottom: 2rem;

		h2 {
			margin-top: 0;
			font-size: 1.25rem;
		}

		ul {
			margin-bottom: 0;
		}

		li {
			margin-bottom: 0.5rem;
		}
	}

	#fallback-contact {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color, #ccc);
		text-align: center;
		font-size: 0.9rem;
	}
`];
