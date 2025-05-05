import { manageState } from '@aegisjsproject/state';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onChange, onSubmit, onReset, onToggle, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, putItem } from '@aegisjsproject/idb';
import { alert, confirm } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { SCHEMA } from '../consts.js';
import { createBarcodeReader, QR_CODE, UPC_A } from '@aegisjsproject/barcodescanner';

// https://training.neighborintake.org/search-results?searchCategory=Alt.%20Id&searchTerm=:term
// Setup on FeedingAmerica

const NEIGBOR_INTAKE = 'https://training.neighborintake.org';
const ADD_ITEM_ID = 'pantry-manual';
const MISSING_ID = '0'.repeat(15);
const MAX_PER_ITEM = 100;
export const title = 'KRV Bridge Pantry Distribution';
export const description = 'Internal app to record food distribution.';

export const openCheckIn = ({ rawValue } = {}) => {
	if (typeof rawValue === 'string' && /^[A-Za-z\d]{7,9}$/.test(rawValue.trim())) {
		const url = new URL('/search-results', NEIGBOR_INTAKE);
		url.searchParams.set('searchCategory', 'Alt. Id');
		url.searchParams.set('searchTerm', rawValue.trim());
		globalThis.open(url);
	}
};

const numberClass = 'small-numeric';
const storageKey = '_lastSync:pantry:inventory';
const STORE_NAME = 'inventory';
const ENABLE_NEIGHBORHOD_INTAKE = false;
const BARCODE_FORMATS = ENABLE_NEIGHBORHOD_INTAKE ? [UPC_A, QR_CODE] : [UPC_A];
const UPC_A_PATTERN = /^\d{12,15}$/;
const PANTRY_ENDPOINT = new URL('/api/pantryDistribution', location.origin).href;
const [cart, setCart] = manageState('cart', []);

const _convertItem = ({ updated, ...data }) => ({ updated: new Date(updated._seconds * 1000), ...data });
const _calcTotal = () => cart.reduce((sum, item) => sum + item.cost * item.qty, 0);
const _updateTotal = () => scheduler.yield().then(() => document.getElementById('cart-grand-total').textContent = _calcTotal().toFixed(2));

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	css`td > input.${numberClass} {
		display: inline-block;
		width: 2.5em;
	}

	#scanner > fieldset {
		padding: 1.2em 0;
	}

	#scanner input[readonly] {
		background-color: inherit;
		border: none;
		color: inherit;
		padding: 0;
		appearance: textfield;
	}

	#scanner input[type="number"][readonly]::-webkit-outer-spin-button,
	#scanner input[type="number"][readonly]::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}


	#scanner input:not([readonly]) {
		border-width: 0 0 1px 0;
		background-color: inherit;
		color: inherit;
	}

	#pantry-cart tbody:empty::after {
		display: block;
		content: "Scan items to add to cart."
	}

	#cart-grand-total {
		font-weight: 800;
		font-size: 1.2rem;
		text-decoration: underline;
	}`,
];

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

function _createItemRow(item) {
	return html`<tr ${data({ productId: item.id })}>
		<td><input type="text" name="item[name]" ${attr({ value: item.name })} readonly="" required="" /></td>
		<td><input type="number" name="item[cost]" ${attr({ value: item.cost.toFixed(2) })} size="5" class="${numberClass}" readonly="" required="" /></td>
		<td><input type="number" name="item[qty]" min="1" max="${MAX_PER_ITEM}" size="4" class="${numberClass}" ${attr({ value: item.qty ?? 1 })} required="" /></td>
		<td><input type="number" name="item[total]" size="7" class="${numberClass}" ${attr({ value: ((item.qty ?? 1) * item.cost).toFixed(2) })} readonly="" required="" /></td>
		<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id })} aria-label="Remove Item">X</button></td>
		<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
	</tr>`;
}

const _getItem = async id => {
	if (typeof id === 'string' && UPC_A_PATTERN.test(id)) {
		const db = await _openDB();

		try {
			const item = await getItem(db, STORE_NAME, id);

			if (typeof item === 'object') {
				db.close();
				return item;
			} else {
				const url = new URL(PANTRY_ENDPOINT);
				url.searchParams.set('id', id);

				const resp = await fetch(url, {
					referrerPolicy: 'no-referrer',
					headers: { Accept: 'application/json' },
					credentials: 'omit',
				});

				if (resp.ok) {
					const result = await resp.json();
					// DB already open from above
					await putItem(db, STORE_NAME, result);
					db.close();
					return result;
				}
			}
		} catch(err) {
			alert(err);
			db.close();
		}
	}
};

async function _addProduct(product) {
	const items = structuredClone(history.state?.cart ?? []);
	const row = _createItemRow(product);
	items.push(product);
	await scheduler.yield();
	document.getElementById('pantry-cart').tBodies.item(0).append(row);
	setCart(items);
	_updateTotal();
}

async function _addToCart(id) {
	try {
		if (typeof id !== 'string') {
			throw new TypeError('Invalid product ID.');
		} else if (id.length < 12) {
			throw new TypeError(`Invalid product ID length for ${id}.`);
		}

		const existing = id === MISSING_ID ? null : document.querySelector(`tr[data-product-id="${id}"]`);

		if (existing instanceof HTMLTableRowElement) {
			const items = structuredClone(history.state?.cart ?? []);
			const itemIndex = items.findIndex(item => item.id === id);
			items[itemIndex].qty++;
			await scheduler.yield();
			existing.querySelector('input[name="item[qty]"]').value = items[itemIndex].qty;
			existing.querySelector('input[name="item[total]"]').value = items[itemIndex].qty * items[itemIndex].cost;
			setCart(items);
			_updateTotal();

			return true;
		} else {
			const product = await _getItem(id);

			if (typeof product?.id !== 'string') {
				throw new Error(`Could not find product with ID of ${id}`);
			} else {
				product.qty = 1;
				await _addProduct(product);

				return true;
			}
		}
	} catch(err) {
		alert(err);
		return false;
	}
}

const submitHandler = registerCallback('pantry:distribution:submit', async event => {
	event.preventDefault();
	const submitter = event.submitter;

	try {
		submitter.disabled = true;

		if (await confirm('Complete checkout?')) {
			const resp = await fetch(PANTRY_ENDPOINT, {
				method: 'POST',
				body: new FormData(event.target),
			}).catch(() => Response.error());

			if (resp.ok) {
				alert('Checkout complete');
				event.target.reset();
			} else {
				alert('Error completing transaction.');
			}
		}
	} catch(err) {
		reportError(err);
		alert(err);
	} finally {
		submitter.disabled = false;
	}

});

const resetHandler = registerCallback('pantry:distribution:reset', () =>{
	setCart([]);
	document.querySelector('#pantry-cart tbody').replaceChildren();
	_updateTotal();
});

const addItemSubmit = registerCallback('pantry:distribution:add:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		submitter.disabled = true;
		const data = new FormData(target);

		await _addProduct({
			id: data.get('id'),
			name: data.get('name'),
			cost: parseFloat(data.get('cost')),
			qty: parseInt(data.get('qty')),
		});

		target.reset();
	} finally {
		submitter.disabled = false;
	}
});

const addItemReset = registerCallback('pantry:distribution:add:reset', ({ target }) => target.hidePopover());

const addItemToggle = registerCallback('pantry:distribution:add:toggle', ({ target, newState }) => {
	if (newState === 'open') {
		target.querySelector('[autofocus]').focus();
	}
});

const barcodeHandler = registerCallback('pantry:barcode:handler', async event => {
	event.preventDefault();

	const data = new FormData(event.target);

	if (await _addToCart(data.get('barcode'))) {
		event.target.reset();
	}
});

const changeHandler = registerCallback('pantry:distribution:change', async ({ target }) => {
	switch(target.name) {
		case 'item[qty]':
			{
				const row = target.closest('tr');
				const cost = row.querySelector('input[name="item[cost]"]');
				const index = cart.findIndex(item => item.id === row.dataset.productId);
				row.querySelector('input[name="item[total]"]').value = target.valueAsNumber * cost.valueAsNumber;

				if (index !== -1) {
					const tmp = structuredClone(history.state?.cart ?? []);
					tmp[index].qty = target.valueAsNumber;
					setCart(tmp);
					_updateTotal();
				}
			}
			break;
	}
});

const clickHandler = registerCallback('pantry:distribution:click', async ({ target }) => {
	switch(target.dataset.action) {
		case 'remove':
			setCart(cart.filter(item => item.id !== target.dataset.productId));
			target.closest('tr').remove();
			_updateTotal();
			break;
	}
});

if (! localStorage.hasOwnProperty(storageKey) || parseInt(localStorage.getItem(storageKey)) < Date.now() - 86400000) {
	const controller = new AbortController();
	const db = await _openDB();

	try {
		const url = new URL(PANTRY_ENDPOINT);
		url.searchParams.set('lastUpdated', localStorage.hasOwnProperty(storageKey) ? localStorage.getItem(storageKey) : '0');

		const items = await fetch(url, {
			headers: { Accept: 'application/json' },
			referrerPolicy: 'no-referrer',
		}).then(resp => resp.json());

		await Promise.all(items.map(item => putItem(db, STORE_NAME, _convertItem(item), { signal: controller.signal })));
		localStorage.setItem(storageKey, Date.now());
	} catch(err) {
		controller.abort(err);
		alert(err);
	} finally {
		db.close();
	}
}

export default function({ signal }) {
	const sig = registerSignal(signal);

	if (! Array.isArray(history.state?.cart)) {
		setCart([]);
	}

	if ('BarcodeDetector' in globalThis) {
		createBarcodeReader(async result => {
			if (typeof result === 'object' && typeof result.rawValue === 'string') {
				switch (result.format) {
					case UPC_A:
						await _addToCart(result.rawValue);
						break;

					case QR_CODE:
						openCheckIn(result);
				}
			}
		}, { signal, formats: BARCODE_FORMATS, errorHandler: alert }).then(({ video }) => {
			const details = document.createElement('details');
			const summary = document.createElement('summary');
			summary.classList.add('btn', 'btn-primary');
			summary.textContent = 'View Camera Feed';
			video.classList.add('fill-width');
			details.append(summary, video);
			document.getElementById('scanner').prepend(details, document.createElement('br'));
		}).catch(reportError);
	}

	return html`<search>
		<form id="barcode-entry" ${onSubmit}="${barcodeHandler}" ${signalAttr}="${sig}">
			<div class="form-group">
				<label for="pantry-barcode" class="input-label">Manually Enter Barcode</label>
				<input name="barcode" id="pantry-barcode" class="input" type="search" inputmode="numeric" pattern="[0-9]{12}" minlength="12" maxlength="12" autocomplete="off" placeholder="${'#'.repeat(12)}" required="" />
			</div>
			<button type="submit" class="btn btn-success">Search</button>
			<button type="reset" class="btn btn-reject">Clear</button>
			<button type="button" class="btn btn-secondary" popovertarget="${ADD_ITEM_ID}" popovertargetaction="show">Add Item</button>
		</form>
		</search>
		<br />
		<form id="scanner" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onClick}="${clickHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border overflow-auto">
			<legend>KRV Bridge Food Pantry</legend>
			<table id="pantry-cart" class="full-width overflow-auto">
				<thead>
					<tr>
						<th>Name</th>
						<th>Price</th>
						<th>Qty</th>
						<th>Total</th>
						<th><span class="mobile-hidden" aria-label="Remove Item">&mdash;</span></th>
						<th class="mobile-hidden">Product ID</th>
					</tr>
				</thead>
				<tbody class="overflow-auto">${cart.map(item => String.dedent`
					<tr ${data({ productId: item.id })}>
						<td><input type="text" name="item[name]" ${attr({ value: item.name })} readonly="" required="" /></td>
						<td><input type="number" name="item[cost]" ${attr({ value: item.cost.toFixed(2) })} size="2" class="${numberClass}" readonly="" required="" /></td>
						<td><input type="number" name="item[qty]" min="1" max="${MAX_PER_ITEM}" size="5" class="${numberClass}" ${attr({ value: item.qty })} required="" /></td>
						<td><input type="number" name="item[total]" size="7" class="${numberClass}" ${attr({ value: (item.qty * item.cost).toFixed(2) })} readonly="" required="" /></td>
						<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id })} aria-label="Remove Item">X</button></td>
						<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
					</tr>
				`).join('')}</tbody>
				<tfoot>
					<tr>
						<th colspan="2">Grand Total</th>
						<td id="cart-grand-total" colspan="3">${_calcTotal()}</td>
						<td class="mobile-hidden"><!-- Intentionally empty --></td>
					</tr>
				</tfoot>
			</table>
		</fieldset>
		<div class="flex row no-wrap">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Empty Cart</button>
			<button type="button" class="btn btn-secondary" popovertarget="${ADD_ITEM_ID}" popovertargetaction="show">Add Item</button>
		</div>
	</form>
	<form id="${ADD_ITEM_ID}" popover="manual" ${onSubmit}="${addItemSubmit}" ${onReset}="${addItemReset}" ${onToggle}="${addItemToggle}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<input type="hidden" name="id" value="${MISSING_ID}" />
			<div class="form-group">
				<label for="pantry-entry-name" class="input-label required">Name</label>
				<input type="text" name="name" id="pantry-entry-name" class="input" placeholder="Product Name" autocomplete="off" list="pantry-add-item-names" autofocus="" required="" />
				<datalist id="pantry-add-item-names">
					<option label="Divert Item" value="Divert Item"></option>
				</datalist>
			</div>
			<div class="form-group">
				<label for="pantry-entry-cost" class="input-label required">Points</label>
				<input type="number" name="cost" id="pantry-entry-cost" class="input" placeholder="##" min="0.25" value="1" max="20" step="0.01" required="" />
			</div>
			<div class="form-group">
				<label for="pantry-entry-qty" class="input-label required">Quantity</label>
				<input type="number" name="qty" id="pantry-entry-qty" class="input" placeholder="##" min="1" max="${MAX_PER_ITEM}" step="1" value="1" required="" />
			</div>
		</fieldset>
		<div class="flex row">
			<button type="submit" class="btn btn-success">Add</button>
			<button type="reset" class="btn btn-danger">Cancel</button>
		</div>
	</form>`;
}
