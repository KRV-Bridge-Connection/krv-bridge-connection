import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';

const submitHandler = registerCallback('oasis:submit', event => {
	event.preventDefault();
	const data = new FormData(event.target);
	event.target.reset();
	const regex = /\{\[(?<type>[A-Z])\](?<id>\d+)\}/;

	const { type, id } = data.get('barcode')?.trim?.()?.match?.(regex)?.groups ?? {};

	switch(type) {
		case 'C':
			window.open('https://capkfoodbank.oasisinsight.net/cases/' + parseInt(id));
			break;
	}
});
export default ({ signal }) => html`<form ${onSubmit}="${submitHandler}" ${signalAttr}="${signal}">
	<div class="form-group">
		<label for="oasis-barcode" class="input-label">Barcode</label>
		<input type="text" name="barcode" id="oasis-barcode" class="input" minlength="13" pattern="\{\[[A-Z]\]\d+\}" placeholder="{[X]########}" autocomplete="off" autofocus="" required="" />
	</div>
	<button type="submit" class="btn btn-success">Submit</button>
	<button type="reset" class="btn btn-danger">Reset</button>
</form>`;
