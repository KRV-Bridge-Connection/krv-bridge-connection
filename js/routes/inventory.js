import { html } from '@aegisjsproject/core/parsers/html.js';
import { createBarcodeScanner, preloadRxing, UPC_A, UPC_E, EAN_13 } from '@aegisjsproject/barcodescanner';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';

const createItem = registerCallback('pantry:inventory:submit', async event => {
	event.preventDefault();

	try {
		if (event.submitter instanceof HTMLButtonElement) {
			event.submitter.disabled = true;
		}

		const body = new FormData(event.target);

		const resp = await fetch('/api/pantryInventory', {
			method: 'POST',
			body,
		});

		if (resp.ok) {
			event.target.reset();
		} else {
			alert(`${resp.url} [${resp.status}]`);
		}
	} finally {
		if (event.submitter instanceof HTMLButtonElement && event.submitter.isConnected) {
			event.submitter.disabled = false;
		}
	}
});

preloadRxing();

export default async ({ signal }) => {
	const sig = registerSignal(signal);

	const { video } = await createBarcodeScanner(result => {
		document.getElementById('pantry-inventory-barcode').value = result.rawValue;
	}, {
		signal,
		formats: [UPC_A, UPC_E, EAN_13]
	});

	/**
	 * @type {DocumentFragment}
	 */
	const frag = html`<form ${onSubmit}="${createItem}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<legend>Add Item to Pantry Inventory</legend>
			<div class="form-group">
				<label for="panry-inventory-name" class="input-label required">Name</label>
				<input type="text" name="name" id="pantry-inventory-name" class="input" placeholder="Item Name" autocomplete="off" required="" />
			</div>
			<div class="form-group">
				<label for="panry-inventory-barcode" class="input-label required">Bacode</label>
				<input type="text" name="barcode" id="pantry-inventory-barcode" class="input" placeholder="########" minlength="8" maxlength="16" inputmode="numeric" pattern="[0-9]+" required="" />
			</div>
			<div class="form-group">
				<label for="panry-inventory-cost" class="input-label required">Points</label>
				<input type="number" name="cost" id="pantry-inventory-cost" class="input" placeholder="##.##" step="0.01" required="" />
			</div>
		</fieldset>
		<div class="flex row wrap">
			<button type="submit" class="btn btn-success">Add Item</button>
		</div>
	</form>`;

	const details = document.createElement('details');
	const summary = document.createElement('summary');
	summary.textContent = 'Toggle Video Feed';
	details.open = true;
	details.append(summary, video);
	frag.prepend(details);

	return frag;
};

export const title = 'Pantry Inventory Management';
export const description = 'Add items to pantry inventory database';
