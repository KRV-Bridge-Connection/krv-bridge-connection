import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { createGIFFile } from '@aegisjsproject/qr-encoder';
import { site } from '../consts.js';

const POPOVER_ID = 'pantry-qr-popover';

const pantryQRSubmit = registerCallback('pantry:qr:submit', async event => {
	event.preventDefault();
	const { promise, resolve, reject } = Promise.withResolvers();
	const controller = new AbortController();
	const { submitter, target } = event;

	try {
		submitter.disabled = true;
		const url = new URL('/pantry/', location.origin);
		const data = new FormData(target);
		url.search = new URLSearchParams(data);

		// const params = new URLSearchParams(new FormData(target));
		const qr = createGIFFile(
			url.href,
			['givenName', 'additionalName', 'familyName', 'suffix']
				.map(field => data.get(field))
				.filter(field => typeof field === 'string' && field.length !== 0)
				.map(field => field.trim().toLocaleLowerCase())
				.join('-') + '-pantry-qr.gif'
		);
		const img = document.createElement('img');
		img.width = 480;
		img.height = img.width;
		img.src = URL.createObjectURL(qr);
		const link = document.createElement('a');
		link.href = img.src;
		link.download = qr.name;
		link.append(img);
		link.classList.add('block');

		document.getElementById('qr-container').replaceChildren(link);
		document.getElementById(POPOVER_ID).showPopover();
		document.getElementById(POPOVER_ID).addEventListener('toggle', ({ newState }) => {
			if (newState === 'closed') {
				resolve();
				controller.abort();
				URL.revokeObjectURL(img.src);
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
		<legend>Create Pantry Quick Sign-In QR</legend>
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
			<span>
				<label for="${POPOVER_ID}-name-suffix" class="input-label">Suffix</label>
				<input type="text"
					name="suffix"
					id="${POPOVER_ID}-name-suffix"
					class="input"
					list="${POPOVER_ID}-suffix-options"
					size="3"
					minlength="2"
					placeholder="Jr., Sr., III, etc." />
				<datalist id="${POPOVER_ID}-suffix-options">
					<option value="Jr">
					<option value="Sr">
					<option value="II">
					<option value="III">
					<option value="IV">
				</datalist>
			</span>
		</div>
		<div class="form-group">
			<label for="pantry-household-size" class="input-label required">Household Size</label>
			<input type="number" name="household" id="pantry-household-size" class="input" placeholder="##" min="1" max="10" autocomplete="off" value="1" required="">
		</div>
	</fieldset>
	<div class="flex row">
		<button type="submit" class="btn btn-success">Create QR</button>
		<button type="reset" class="btn btn-danger">Clear</button>
	</div>
</form>
<div id="${POPOVER_ID}" popover="manual">
	<div id="qr-container"></div>
	<button type="button" class="btn btn-primary" commandfor="${POPOVER_ID}" command="hide-popover">Close Popover</button>
</div>`;

export const title = site.title + ' | Choice Pantry Registration QRs' ;
export const description = 'Generate QR codes to more easily register for the pantry';
