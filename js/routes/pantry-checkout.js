import { manageState } from '@aegisjsproject/state';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onChange, onSubmit, onReset, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, putItem } from '@aegisjsproject/idb';
import { SCHEMA } from '../consts.js';

const STORE_NAME = 'inventory';

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

function createItemRow(item) {
	return html`<tr data-product-id="${item.id}">
		<td><input type="text" name="item[name]" value="${item.name}" readonly="" required="" /></td>
		<td><input type="text" name="item[id]" value="${item.id}" readonly="" required="" /></td>
		<td><input type="number" name="item[price]" value="${item.price}" size="2" readonly="" required="" /></td>
		<td><input type="number" name="item[qty]" min="1" max="10" size="2" value="${item.qty ?? 1}" required="" /></td>
		<td><input type="number" name="item[total]" size="3" value="${(item.qty ?? 1) * item.price}" readonly="" required="" /></td>
		<td><button type="button" class="btn btn-danger" data-action="remove" data-product-id="${item.id}" aria-label="Remove Item">X</button></td>
	</tr>`;
}

const controller = new AbortController();
const db = await _openDB();

try {
	await Promise.all([
		putItem(db, STORE_NAME, { id: '019722082928', name: 'Canned Chicken Breast', price: 5 }, { signal: controller.signal }),
		putItem(db, STORE_NAME, { id: '402154270009', name: 'Chunky Salsa', price: 4 }, { signal: controller.signal }),
		putItem(db, STORE_NAME, { id: '402153750007', name: 'Beef Stew', price: 4 }, { signal: controller.signal }),
	])
} catch(err) {
	controller.abort(err);
	alert(err);
} finally {
	db.close();
}

const _getItem = async id => {
	const db = await _openDB();

	try {
		const item = await getItem(db, STORE_NAME, id);
		db.close();
		return item;
	} catch(err) {
		alert(err);
		db.close();
	}
};

const [cart, setCart] = manageState('cart', []);

const submitHandler = registerCallback('pantry:checkout:submit', async event => {
	event.preventDefault();
	const resp = await fetch('/api/checkout', {
		method: 'POST',
		body: new FormData(event.target),
	});

	if (resp.ok) {
		alert('Checkout complete');
		event.target.reset();
	} else {
		alert('Error completing checkout.');
	}
});

const resetHandler = registerCallback('pantry:checkout:reset', () =>{
	setCart([]);
	document.querySelector('#pantry-cart tbody').replaceChildren();
	updateTotal();
});

const changeHandler = registerCallback('pantry:checkout:change', async ({ target }) => {
	switch(target.name) {
		case 'item[qty]': {
			const row = target.closest('tr');
			const price = row.querySelector('input[name="item[price]"]');
			const index = cart.findIndex(item => item.id === row.dataset.productId);
			row.querySelector('input[name="item[total]"]').value = target.valueAsNumber * price.valueAsNumber;

			if (index !== -1) {
				const tmp = structuredClone(history.state.cart);
				tmp[index].qty = target.valueAsNumber;
				setCart(tmp);
				updateTotal();
			}
		}
		break;

		case 'checkout-scanner': {
			if (target.files.length === 1) {
				try {
					const scanner = new BarcodeDetector();
					const src = URL.createObjectURL(target.files.item(0));
					target.value = null;
					const img = document.createElement('img');
					img.decoding = 'async';
					img.src = src;
					await img.decode();
					const [result] = await scanner.detect(img);

					if (typeof result === 'object' && typeof result.rawValue === 'string') {
						const product = await _getItem(result.rawValue);

						if (typeof product?.id !== 'string') {
							throw new Error(`Could not find product with ID of ${result.rawValue}`);
						} else {
							product.qty = 1;
							const items = structuredClone(history.state.cart ?? []);
							items.push(product);
							setCart(items);
							const row = createItemRow(product);
							document.getElementById('pantry-cart').tBodies.item(0).append(row);
							updateTotal();
						}
					}
				} catch(err) {
					alert(err);
				}
			} else if (target.files.length !== 0) {
				target.value = null;
			}
		}
	}
});

const clickHandler = registerCallback('pantry:checkout:click', async ({ target }) => {
	switch(target.dataset.action) {
		case 'scan':
			document.getElementById('checkout-scanner').showPicker();
		break;

		case 'remove': {
			setCart(cart.filter(item => item.id !== target.dataset.productId));
			row.remove();
			updateTotal();
		}
		break;
	}
});

const calcTotal = () => cart.reduce((sum, item) => sum + item.price * item.qty, 0);
const updateTotal = () => document.getElementById('cart-grand-total').textContent = calcTotal();

export default function({ signal }) {
	const sig = registerSignal(signal);

	return html`<form id="scanner" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onClick}="${clickHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border">
			<legend>KRV Bridge Connection Food Pantry</legend>
			<table id="pantry-cart">
				<thead>
					<tr>
						<th>Name</th>
						<th>Product ID</th>
						<th>Price</th>
						<th>Quantity</th>
						<th>Total</th>
						<th>Remove</th>
					</tr>
				</thead>
				<tbody>${cart.map(item => String.dedent`
					<tr data-product-id="${item.id}">
						<td><input type="text" name="item[name]" value="${item.name}" readonly="" required="" /></td>
						<td><input type="text" name="item[id]" value="${item.id}" readonly="" required="" /></td>
						<td><input type="number" name="item[price]" value="${item.price}" size="2" readonly="" required="" /></td>
						<td><input type="number" name="item[qty]" min="1" max="10" size="2" value="${item.qty}" required="" /></td>
						<td><input type="number" name="item[total]" size="3" value="${item.qty * item.price}" readonly="" required="" /></td>
						<td><button type="button" class="btn btn-danger" data-action="remove" data-product-id="${item.id}" aria-label="Remove Item">X</button></td>
					</tr>
				`).join('')}</tbody>
				<tfoot>
					<tr>
						<td colspan="4"><!-- Intentionally empty --></td>
						<th>Grand Total</th>
						<td id="cart-grand-total">${calcTotal()}</td>
					</tr>
				</tfoot>
			</table>
		</fieldset>
		<button type="button" class="btn btn-primary" aria-label="Scan item" accesskey="+" data-action="scan">Scan Item</button>
		<input type="file" name="checkout-scanner" accept="image/*" capture="environment" id="checkout-scanner" hidden="" />
		<button type="reset" class="btn btn-danger">Empty Cart</button>
	</form>`;
}
