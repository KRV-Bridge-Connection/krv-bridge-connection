import { manageState, setState } from '@aegisjsproject/state';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { navigate } from '@aegisjsproject/router';
import { onClick, onChange, onSubmit, onReset, onToggle, onFocus, signal as signalAttr, capture, registerSignal, getSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, putItem } from '@aegisjsproject/idb';
import { alert, confirm } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { SCHEMA } from '../consts.js';
import { createBarcodeScanner, preloadRxing, QR_CODE, UPC_A, UPC_E, EAN_13 } from '@aegisjsproject/barcodescanner';
import { fetchWellKnownKey } from '@shgysk8zer0/jwk-utils/jwk.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';
import { HTMLStatusIndicatorElement } from '@shgysk8zer0/components/status-indicator.js';

export const title = 'KRV Bridge Pantry Distribution';
export const description = 'Internal app to record food distribution.';
const ADD_ITEM_ID = 'pantry-manual';
const MAX_PER_ITEM = 99;
const OTHER_ELS = ['nav', 'sidebar', 'footer'];

const numberClass = 'small-numeric';
const JWT_EXP = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_=]*$/;
const STATUS_ID = 'pantry-submit-status';
const ORIENTATION = 'portrait';
const key = await fetchWellKnownKey(location.origin);

const SUGGESTED_ITEMS = [
	'Eggs',
	'Bread',
	'Fruit',
	'Vegetables',
	'Trail Mix',
	'Snacks',
	'Cheese',
	'Divert Item',
];

const QUICK_ITEMS = [
	{ name: 'Bread', cost: 3, id: 'A9D5D64F-20B5-4946-A466-110F131469D7' },
	{ name: 'Frozen Food (Sm)', cost: 1, id: 'CDFB935F-40D1-45C4-8C72-857A5B889ED8' },
	{ name: 'Small Canned Food', cost: 2, id: '58393A8E-5116-4FE2-B094-EAFC8539CB45' },
	{ name: 'Large Canned Food', cost: 3, id: 'B0E1D581-D21B-49BC-AF94-13323C57B0B5' },
	{ name: 'Eggs', cost: 0.5, id: 'F484DA58-CBD2-45B8-9009-4CA9C90C0B99' },
	{ name: 'Water', cost: 0.5, id: 'B9C63BFA-91DA-484B-999F-5CC078B4DCB9' },
	{ name: 'Fruit', cost: 0.5, id: 'B3CC6364-FC34-45BE-A674-64FCA1E2A15E' },
	{ name: 'Vegetables', cost: 1, id: 'F270F0C2-C5C4-4C21-BBC7-B26EF0657271' },
	{ name: 'Snacks', cost: 1, id: '113A4AF0-99E4-4967-B160-2D7FC80872D9' },
	{ name: 'Granola Bar', cost: 1, id: '2FAD54D7-6C24-444F-BF66-BECF5F581F0F' },
	{ name: 'Baby Food', cost: 1, id: '1FB8120C-C69C-47AF-8610-B98C7476BFA8' },
	{ name: 'Frozen Meal', cost: 5, id: '04746271-3D97-488B-BA98-01E2B8D4FDAE' },
	{ name: 'Garden Bag', cost: 3, id: '82653B3E-18AC-4DCE-815D-B3016DCEB46C' },
];

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	css`td > input.${numberClass} {
		display: inline-block;
		width: 2.5em;
	}

	#scanner > fieldset {
		padding: 1.2em 0;
	}

	#scanner input[readonly]:not(.display-text) {
		background-color: inherit;
		border: none;
		color: inherit;
		padding: 0;
		appearance: textfield;
	}

	#scanner input.display-text {
		display: inline;
		border: none;
		padding: none;
		appearance: unset;
		color: inherit;
		background: inherit;
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

	#pantry-manual .quick-items {
		gap: 0.7rem;
	}

	#cart-grand-total {
		font-weight: 800;
		font-size: 1.2rem;
		text-decoration: underline;

		&.cart-over-budget {
			background-color: #da1212;
			color: #fafafa;
		}
	}

	#pantry-cart {
		width: 100%;
		border-collapse: collapse;
	}

	#pantry-cart-foot {
		position: sticky;
		bottom: 0;
	}

	#cart-end-btn {
		right: 1em;
		bottom: 1em;
	}

	:root:has(#pantry-cart) {
		body > button[is="share-button"] {
			display: none;
		}

		#main:fullscreen {
			overflow: auto;
		}

		:fullscreen #sidebar, :fullscreen #footer {
			display: none;
		}
	}`,
];

const numberFormatter = new Intl.NumberFormat('en', {
	maximumFractionDigits: 2,
	minimumFractionDigits: 2,
	minimumIntegerDigits: 1,
});

const unlock = () => screen.orientation.unlock();
const lockScreen = registerCallback('pantry:distribution:orientation-lock', async ({ currentTarget }) => {
	await document.getElementById('main').requestFullscreen();
	await screen.orientation.lock(ORIENTATION);

	if (currentTarget.hasAttribute(signalAttr)) {
		const signal = getSignal(currentTarget.getAttribute(signalAttr));

		if (signal instanceof AbortSignal) {
			signal.addEventListener('abort', unlock, { once: true });
		}
	}
});

const storageKey = '_lastSync:pantry:inventory';
const STORE_NAME = 'inventory';
const BARCODE_FORMATS = [UPC_A, UPC_E, QR_CODE, EAN_13];
const UPC_PATTERN = /^\d{8,15}$/;
const PANTRY_ENDPOINT = new URL('/api/pantryDistribution', location.origin).href;
const [cart, setCart] = manageState('cart', []);

const _convertItem = ({ updated, ...data }) => ({ updated: new Date(updated._seconds * 1000), ...data });
const _calcTotal = () => cart.reduce((sum, item) => sum + item.cost * item.qty, 0);

async function _updateTotal() {
	await scheduler.yield();
	const cartTotal = document.getElementById('cart-grand-total');
	const total = _calcTotal();
	cartTotal.textContent = numberFormatter.format(total);
	const points = parseFloat(cartTotal.dataset.points);

	if (! Number.isNaN(points)) {
		cartTotal.classList.toggle('cart-over-budget', total > points);
	}
}

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

function _createItemRow(item) {
	return html`<tr ${data({ productId: item.id })}>
		<td><input type="text" name="item[name]" ${attr({ value: item.name })} readonly="" required="" /></td>
		<td><input type="number" name="item[cost]" ${attr({ value: item.cost.toFixed(2) })} size="5" class="${numberClass}" readonly="" required="" /></td>
		<td><input type="number" name="item[qty]" min="1" max="${MAX_PER_ITEM}" size="4" class="${numberClass}" ${attr({ value: item.qty ?? 1 })} required="" /></td>
		<td><input type="number" name="item[total]" size="7" class="${numberClass}" ${attr({ value: numberFormatter.format((item.qty ?? 1) * item.cost) })} readonly="" required="" /></td>
		<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id, name: item.name })} aria-label="Remove Item">X</button></td>
		<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
	</tr>`;
}

const _getItem = async id => {
	if (typeof id === 'string' && UPC_PATTERN.test(id)) {
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
		const existing = document.querySelector(`tr[data-product-id="${id}"]`);

		if (typeof id !== 'string') {
			throw new TypeError('Invalid product ID.');
		} else if (id.length < 8) {
			throw new TypeError(`Invalid product ID length for ${id}.`);
		} else if (existing instanceof HTMLTableRowElement) {
			await scheduler.yield();
			const items = structuredClone(history.state?.cart ?? []);
			const itemIndex = items.findIndex(item => item.id === id);
			const qty = existing.querySelector('input[name="item[qty]"]');
			items[itemIndex].qty++;
			qty.value = items[itemIndex].qty;
			existing.querySelector('input[name="item[total]"]').value = numberFormatter.format(items[itemIndex].qty * items[itemIndex].cost);
			setCart(items);
			await scheduler.yield();
			qty.reportValidity();
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
	const { submitter, target } = event;
	const status = document.getElementById(STATUS_ID);
	const body = new FormData(target);

	try {
		status.reset({ idle: false });
		submitter.disabled = true;

		if (! body.has('item[id]')) {
			throw new Error('No items in cart.');
		} else  if (await confirm('Complete checkout?')) {
			const resp = await fetch(PANTRY_ENDPOINT, {
				method: 'POST',
				body: new FormData(target),
			}).catch(() => Response.error());

			if (resp.ok) {
				setCart([]);
				target.reset();
				status.resolve();
			} else {
				alert('Error completing transaction.');
				status.reject();
			}
		}
	} catch(err) {
		status.reject();
		reportError(err);
		alert(err);
	} finally {
		setTimeout(() => status.idle = true, 3000);
		submitter.disabled = false;
	}
});

const quickAdd = registerCallback('pantry:distribution:quick-add', async ({ target }) => {
	const { name, cost: costStr } = target.dataset;
	const cost = parseFloat(costStr);

	if (typeof name === 'string' && ! Number.isNaN(cost) && cost > 0) {
		await _addProduct({
			name, cost, id: crypto.randomUUID(), qty: 1,
		});
	}

	target.closest('[popover]').hidePopover();
});

const scrollToEnd = registerCallback('pantry:distribution:scroll-to-end', () => {
	document.getElementById('pantry-cart').scrollIntoView({ behavior: 'smooth', block: 'end' });
});

const resetHandler = registerCallback('pantry:distribution:reset', event => {
	if (event.isTrusted && cart.length !== 0 && ! globalThis.confirm('Reset pantry?')) {
		event.preventDefault();
	} else {
		history.replaceState({ cart: [] }, '', location.href);
		document.querySelector('#pantry-cart tbody').replaceChildren();
		document.getElementById('appt-details').hidden = true;
		_updateTotal();
	}
});

const addItemSubmit = registerCallback('pantry:distribution:add:submit', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		submitter.disabled = true;
		const data = new FormData(target);

		await _addProduct({
			id: crypto.randomUUID(),
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
		const input = target.querySelector('[autofocus]');
		input.focus();
		input.select();
	}
});

const focusInput = registerCallback('pantry:distribution:input:focus', ({ target }) => {
	if (target instanceof HTMLInputElement && ! target.readOnly) {
		target.select();
	}
});

const changeHandler = registerCallback('pantry:distribution:change', async ({ target }) => {
	switch(target.name) {
		case 'item[qty]':
			{
				const row = target.closest('tr');
				const cost = row.querySelector('input[name="item[cost]"]');
				const index = cart.findIndex(item => item.id === row.dataset.productId);

				if (index !== -1) {
					row.querySelector('input[name="item[total]"]').value = numberFormatter.format(target.valueAsNumber * cost.valueAsNumber);
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
			if (await confirm(`Delete ${target.dataset.name ?? 'Product'}?`)) {
				setCart(cart.filter(item => item.id !== target.dataset.productId));
				target.closest('tr').remove();
				_updateTotal();

			}
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
			signal: controller.signal,
		}).then(resp => resp.json());

		await Promise.all(items.map(item => putItem(db, STORE_NAME, _convertItem(item), { signal: controller.signal })));
		localStorage.setItem(storageKey, Date.now());
		controller.abort();
	} catch(err) {
		controller.abort(err);
		alert(err);
	} finally {
		db.close();
	}
}

preloadRxing();

export default async function({
	state: {
		token = '',
		givenName = '',
		familyName = '',
		household = '',
		points = '',
	},
	signal,
} = {}) {
	const sig = registerSignal(signal);
	const closeWatcher = new CloseWatcher({ signal });
	OTHER_ELS.forEach(id => document.getElementById(id).inert = true);

	closeWatcher.addEventListener('cancel', (event) => {
		if (globalThis.confirm('Exit page?')) {
			closeWatcher.destroy();
			OTHER_ELS.forEach(id => document.getElementById(id).inert = false);
			navigate('/');
			unlock();
		} else {
			event.preventDefault();
		}
	}, { signal });

	signal.addEventListener('abort', () => {
		OTHER_ELS.forEach(id => document.getElementById(id).inert = false);
	});

	if (! Array.isArray(history.state?.cart)) {
		setCart([]);
	}

	createBarcodeScanner(async result => {
		if (typeof result === 'object' && typeof result.rawValue === 'string') {
			switch (result.format) {
				case UPC_A:
				case UPC_E:
				case EAN_13:
					await _addToCart(result.rawValue);
					break;

				case QR_CODE:
					if (result.rawValue.length > 50 && JWT_EXP.test(result.rawValue)) {
						try {
							const decoded = await verifyJWT(result.rawValue, key, {
								scope: 'pantry',
							});

							if (decoded instanceof Error) {
								throw new Error('Error validating token. It may be invalid or expired.', { cause: decoded });
							} else {
								const {
									nbf,
									exp,
									txn: id,
									toe: timestamp,
									given_name: givenName,
									family_name: familyName,
									authorization_details: {
										household,
										points,
									} = {}
								} = decoded;

								const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp * 1000);
								const notBefore = new Date(nbf * 1000);
								const expires = new Date(exp * 1000);
								const now = Date.now();

								if ((now < expires.getTime() && now > notBefore.getTime()) || await confirm(`This appt was scheduled for ${date.toLocaleString()}. Allow it?`)) {
									setState('givenName', givenName);
									setState('familyName', familyName);
									setState('points', points);
									setState('household', household);
									setState('token', result.rawValue);

									document.getElementById('pantry-appt').value = id;
									document.getElementById('pantry-given-name').value = givenName;
									document.getElementById('pantry-family-name').value = familyName;
									document.getElementById('pantry-points').value = points;
									document.getElementById('pantry-household').value = household;
									document.getElementById('appt-details').hidden = false;
									document.getElementById('cart-grand-total').dataset.points = points;
									document.getElementById('pantry-token').value = result.rawValue;
								}
							}
						} catch(err) {
							await alert(err);
						}
					}
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

	setTimeout(() => {
		const status = new HTMLStatusIndicatorElement();
		status.id = STATUS_ID;
		status.idle = true;
		document.querySelector('#scanner .btn-success').append(status);
	}, 2000);

	return html`
		<form id="scanner" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onClick}="${clickHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border overflow-auto" ${onFocus}="${focusInput}" ${signalAttr}="${sig}" ${capture}>
			<legend>KRV Bridge Food Pantry</legend>
			<div>
				<a href="/pantry/" class="btn btn-link no-router" target="_blank">Create an Appointment</a>
			</div>
			<div id="appt-details" ${attr({ hidden: Number.isNaN(parseInt(points)) })}>
				<input type="hidden" name="appt" id="pantry-appt" class="display-text" />
				<input type="hidden" name="pantry-token" id="pantry-token" ${attr({ value: token })} />
				<div>
					<b>Name:</b>
					<input type="text" id="pantry-given-name" class="display-text" name="givenName" ${attr({ value: givenName })} readonly="" />
					<input type="text" id="pantry-family-name" class="display-text" name="familyName" ${attr({ value: familyName })} readonly="" />.
				</div>
				<div>
					<b>Points:</b>
					<input type="text" id="pantry-points" class="display-text" name="budget" ${attr({ value: points })} readonly="" />
				</div>
				<div>
					<b>Household Size:</b>
					<input type="text" id="pantry-household" class="display-text" name="household" ${attr({ value: household })} readonly="" />
				</div>
			</div>
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
						<td><input type="number" name="item[cost]" ${attr({ value: numberFormatter.format(item.cost) })} size="2" class="${numberClass}" readonly="" required="" /></td>
						<td><input type="number" name="item[qty]" min="1" max="${MAX_PER_ITEM}" size="5" class="${numberClass}" ${attr({ value: item.qty })} required="" /></td>
						<td><input type="number" name="item[total]" size="7" class="${numberClass}" ${attr({ value: numberFormatter.format(item.qty * item.cost) })} readonly="" required="" /></td>
						<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id, name: item.name })} aria-label="Remove Item">X</button></td>
						<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
					</tr>
				`).join('')}</tbody>
				<tfoot id="pantry-cart-foot">
					<tr>
						<th colspan="2">Grand Total</th>
						<td id="cart-grand-total" colspan="3" ${attr({ 'data-points': typeof points === 'number' ? points : null })}>${numberFormatter.format(_calcTotal())}</td>
						<td class="mobile-hidden"><!-- Intentionally empty --></td>
					</tr>
				</tfoot>
			</table>
		</fieldset>
		<div class="flex row no-wrap">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Empty Cart</button>
			<button type="button" class="btn btn-secondary" popovertarget="${ADD_ITEM_ID}" popovertargetaction="show">Add Item</button>
			<button type="button" class="btn btn-secondary" ${onClick}="${lockScreen}" ${signalAttr}="${sig}" aria-label="Lock Orientation" ${attr({ disabled: ! (screen?.orientation?.lock instanceof Function) })}>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" class="icon" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M13 10h1v3c0 .547-.453 1-1 1h-3v-1h3v-3zM1 10H0v3c0 .547.453 1 1 1h3v-1H1v-3zm0-7h3V2H1c-.547 0-1 .453-1 1v3h1V3zm1 1h10v8H2V4zm2 6h6V6H4v4zm6-8v1h3v3h1V3c0-.547-.453-1-1-1h-3z"/>
				</svg>
			</button>
		</div>
	</form>
	<form id="${ADD_ITEM_ID}" popover="manual" ${onSubmit}="${addItemSubmit}" ${onReset}="${addItemReset}" ${onToggle}="${addItemToggle}" ${signalAttr}="${sig}">
		<div>
			<div class="flex row wrap quick-items" ${onClick}="${quickAdd}" ${signalAttr}="${sig}">${QUICK_ITEMS.map(({ name, cost, id }) => `<button type="button" class="btn btn-seconday" ${data({ name, cost, id })}>${name}</button>`).join('')}</div>
			<hr />
		</div>
		<fieldset class="no-border" ${onFocus}="${focusInput}" ${signalAttr}="${sig}" ${capture}>
			<div class="form-group">
				<label for="pantry-entry-name" class="input-label required">Name</label>
				<input type="text" name="name" id="pantry-entry-name" class="input" placeholder="Product Name" autocomplete="off" list="pantry-add-item-names" autofocus="" required="" />
				<datalist id="pantry-add-item-names">
					${SUGGESTED_ITEMS.map(item => `<option ${attr({ label: item, value: item })}></option>`).join('')}
				</datalist>
			</div>
			<div class="form-group">
				<label for="pantry-entry-cost" class="input-label required">Points</label>
				<input type="number" name="cost" id="pantry-entry-cost" class="input" placeholder="##" min="0" value="1" max="30" step="0.01" required="" />
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
	</form>
	<button type="button" id="cart-end-btn" class="btn btn-secondary fixed bottom right" ${onClick}="${scrollToEnd}" ${signalAttr}="${sig}" aria-label="Scroll to Cart End">
		<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16" class="icon" fill="currentColor" aria-hidden="true">
			<path fill-rule="evenodd" d="M5 11L0 6l1.5-1.5L5 8.25 8.5 4.5 10 6l-5 5z"/>
		</svg>
	</button>`;
}
