import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';

const id = '_' + crypto.randomUUID();

const SERVICES = [
	'Homeless Services',
	'GED Tutoring',
	'Legal Assistance',
	'Choice Pantry',
	'Utility Assistance',
	'Payee Services',
	'Entrepreneur Classes',
];

export const styles = css`
	@media print {
		body > :not(#main),
		.no-print {
			display: none;
		}

		#main {
			width: auto;
			max-width: unset;
			border: none;
		}

		fieldset {
			margin: 1em;
			padding: 1em;
		}

		h1, h2, h3, .form-group, .input {
			margin: 0;
			padding: 0;
		}

		.bridge-logo {
			width: 45%;
		}
	}

	#${id} {
		& .service {
			display: block;
			border: 1px solid #dedede;
			width: 23ch;
			padding: 0.4em;
			border-radius: 6px;

			& input[type="checkbox"] {
				font-size: 2em;
				width: 1em;
				height: 1em;
				margin-inline-end: 0.6em;
				vertical-align: middle;
				accent-color: light-dark(white, #232323);
			}
		}

		& .flex {
			gap: 0.4em;
		}

		& fieldset {
			font-family: system-ui;
			max-width: 800px;
		}

		textarea {
			display: block;
			width: 100%;
			height: 7lh;
			resize: none;
			border: 1px solid #dedede;
		}

		legend {
			font-size: 1.3em;
			font-weight: 800;
		}
	}
`;

export default () => html`<form id="${id}">
	<div class="center">
		<h2 class="no-print">KRV Bridge Connection Assistance Form</h2>
		<img src="/img/branding/krv-bridge-logo-wide-blue.svg" referrerpolicy="no-referrer" class="bridge-logo" alt="" />
	</div>
	<fieldset class="no-border">
		<legend>Contact Info</legend>
		<div class="form-group">
			<label for="contact-name" class="input-label required">Name</label>
			<input type="text" name="name" id="contact-name" class="input" autocomplate="name" required="" />
		</div>
		<div class="form-group">
			<label for="contact-phone" class="input-label">Telephone</label>
			<input type="tel" name="telephone" id="contact-phone" class="input" autocomplate="telephone" />
		</div>
		<div class="form-group">
			<label for="contact-email" class="input-label">Email</label>
			<input type="tel" name="telephone" id="contact-email" class="input" autocomplate="email" />
		</div>
	</fieldset>
	<fieldset class="flex row wrap no-border">
		<legend>Which Services are you Interested In</legend>
	 	 ${SERVICES.map(service => `<label class="service block">
		<input type="checkbox" name="items[]" value="${service}"/>
		<span>${service}</span>
	</label>`).join('')}
	</fieldset>
	<fieldset class="no-border">
		<legend>Is there anything else you would like to share?</legend>
		<label>
			<textarea name="comments"></textarea>
		</label>
	</fieldset>
</form>`;
