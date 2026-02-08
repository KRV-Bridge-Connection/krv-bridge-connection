import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onBlur, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { url } from '@aegisjsproject/url/url.min.js';

const ID_PATTERN = /^\{\[(?<type>[A-Z])\](?<id>\d{6,13})\}$/;
const PATTERN_STR = ID_PATTERN.source.replaceAll(/[\^$]|\?<[^>]+>/g, '');
const NAME = 'barcode';
const INPUT_ID = 'oasis-barcode';
const ERROR_DURATION = 5_000;
const resetHandler = registerCallback('oasis:reset', ({ target }) => target.elements.namedItem(NAME).focus());
const submitOnBlur = registerCallback('oasis:blur', ({ target }) => target.validity.valid && target.form.requestSubmit());

async function showError(message, { timeout = ERROR_DURATION } = {}) {
	const id = '_' + crypto.randomUUID();
	const { resolve, promise } = Promise.withResolvers();
	const popover = el`<div class="status-box error oasis-error" id="${id}" popover="auto">
		<button type="button" class="btn btn-outline-danger absolute top right" command="hide-popover" commandfor="${id}" aria-label="Close Popove">X</button>
		<p class="clearfix">${message}</p>
	</div>`;

	popover.addEventListener('toggle', ({ target, newState }) => {
		if (newState === 'closed') {
			target.remove();
			resolve();
		}
	});

	document.body.append(popover);
	popover.showPopover();
	setTimeout(() => {
		if (popover.isConnected) {
			popover.hidePopover();
		}
	}, timeout);

	return promise;
}

const submitHandler = registerCallback('oasis:submit', async event => {
	event.preventDefault();
	const target = event.target;
	const submitter = event?.submitter;
	const data = new FormData(target);
	const { type, id } = data.get(NAME)?.trim()?.match(ID_PATTERN)?.groups ?? {};

	if (typeof type === 'string' && typeof id === 'string') {
		try {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = true;
			}
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
					await showError(`Unsupported type [${type}] with ID <q>${id}</q>`);
					target.reset();
			}
		} catch(err) {
			await showError(err);
		} finally {
			if (submitter instanceof HTMLButtonElement) {
				submitter.disabled = false;
			}
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
