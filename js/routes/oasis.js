import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onBlur, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';

const ID_PATTERN = /^\{\[(?<type>[A-Z])\](?<id>\d{6,13})\}$/;
const PATTERN_STR = ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const ERROR_DURATION = 2000;
const resetHandler = registerCallback('oasis:reset', ({ target }) => target.elements.namedItem(NAME).focus());
const submitOnBlur = registerCallback('oasis:blur', ({ target }) => target.validity.valid && target.form.requestSubmit());
const submitHandler = registerCallback('oasis:submit', event => {
	event.preventDefault();
	const target = event.target;
	const data = new FormData(target);
	const { type, id } = data.get(NAME)?.trim()?.match(ID_PATTERN)?.groups ?? {};

	if (typeof type === 'string' && typeof id === 'string') {
		const input = target.elements.namedItem(NAME);

		switch(type) {
			case 'C':
				globalThis.open(
					url`https://capkfoodbank.oasisinsight.net/cases/${parseInt(id)}/case_barcode_lookup/`,
					'_blank',
					'noopener,noreferrer'
				);

				target.reset();
				break;

			default:
				input.after(html`<div class="status-box error">Unsupported type [${type}] with ID <q>${id}</q></div>`);
				setTimeout(input.nextElementSibling?.remove?.bind(input.nextElementSibling), ERROR_DURATION);
				target.reset();
		}
	} else {
		target.reset();
	}
});

export default ({ signal }) => html`<form ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
	<fieldset class="no-border">
		<legend>Oasis Case Scanner</legend>
		<div class="form-group">
			<label for="${INPUT_ID}" class="input-label">Barcode</label>
			<input type="text" name="${NAME}" id="${INPUT_ID}" class="input" pattern="${PATTERN_STR}" placeholder="{[X]########}" autocomplete="off" ${onBlur}="${submitOnBlur}" ${signalAttr}="${signal}" autofocus="" required="" />
		</div>
	</fieldset>
	<button type="submit" class="btn btn-success btn-lg">Submit</button>
	<button type="reset" class="btn btn-danger btn-lg">Reset</button>
</form>`;
