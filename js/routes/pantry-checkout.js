import { manageState } from '@aegisjsproject/state';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onChange, onSubmit, onReset, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, putItem } from '@aegisjsproject/idb';
import { alert } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { SCHEMA } from '../consts.js';

export const title = 'KRV Bridge Pantry Checkout';
export const description = 'Internal app to record food distribution.';

const numberClass = 'small-numeric';
const storageKey = '_lastSync:pantry:inventory';
const STORE_NAME = 'inventory';
const [cart, setCart] = manageState('cart', []);

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	css`td > input.${numberClass} {
		display: inline-block;
		width: 1.8em;
	}

	#scanner > fieldset {
		padding: 1.2em 0;
	}

	#scanner input[readonly] {
		background-color: inherit;
		border: none;
		color: inherit;
		padding: 0;
	}

	#scanner input:not([readonly]) {
		border-width: 0 0 1px 0;
		background-color: inherit;
		color: inherit;
	}

	#pantry-cart tbody:empty::after {
		display: block;
		content: "Scan items to add to cart."
	}`,
];

function playChime() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1kHz ding
    gain.gain.setValueAtTime(0.2, ctx.currentTime); // Adjust volume

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2); // Short chime
}

async function createStream(cb = console.log, { signal } = {}) {
	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else {
		let af = NaN;
		const scanner = 'BarcodeDetector' in globalThis ? new BarcodeDetector() : undefined;
		const wakeLock = 'wakeLock' in navigator ? await navigator.wakeLock.request('screen').catch(() => undefined) : undefined;
		const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }});
		const video = document.createElement('video');
		video.srcObject = stream;
		video.play();

		const canvas = new OffscreenCanvas(640, 480); // Adjust dimensions as needed
		const ctx = canvas.getContext('2d');

		async function drawFrame() {
			try {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				if (typeof scanner !== 'undefined') {
					const results = await scanner.detect(ctx.canvas).catch(err => [{ rawValue: err.message }]);

					if (results.length !== 0) {
						playChime();
						await Promise.allSettled(results.map(cb));
						await new Promise(resolve => setTimeout(resolve, 1_500));
					}

					af = requestAnimationFrame(drawFrame);
				} else {
					af = requestAnimationFrame(drawFrame);
				}
			} catch(err) {
				alert(err.message);
			}
		}

		video.addEventListener('loadedmetadata', ({ target }) => {
			const tracks = stream.getVideoTracks();
			const { width, height } = tracks[0].getSettings();
			target.width = width;
			target.height = height;
			canvas.width = width;
			canvas.height = height;
			drawFrame();
		}, { once: true });

		if (signal instanceof AbortSignal) {
			signal.addEventListener('abort', async () => {
				video.pause();
				cancelAnimationFrame(af);
				stream.getTracks().forEach(track => track.stop());

				if (typeof wakeLock === 'object') {
					await wakeLock.release();
				}
			}, { once: true });
		}
	}
}

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

function createItemRow(item) {
	return html`<tr ${data({ productId: item.id })}>
		<td><input type="text" name="item[name]" ${attr({ value: item.name })} readonly="" required="" /></td>
		<td><input type="number" name="item[cost]" ${attr({ value: item.cost })} size="2" class="${numberClass}" readonly="" required="" /></td>
		<td><input type="number" name="item[qty]" min="1" max="10" size="2" class="${numberClass}" ${attr({ value: item.qty ?? 1 })} required="" /></td>
		<td><input type="number" name="item[total]" size="3" class="${numberClass}" ${attr({ value: (item.qty ?? 1) * item.cost })} readonly="" required="" /></td>
		<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id })} aria-label="Remove Item">X</button></td>
		<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
	</tr>`;
}

if (! localStorage.hasOwnProperty(storageKey) || parseInt(localStorage.getItem(storageKey)) < Date.now() - 86400000) {
	const controller = new AbortController();
	const db = await _openDB();

	try {
		const items = await fetch('/api/pantryCheckout').then(resp => resp.json());
		await Promise.all(items.map(item => putItem(db, STORE_NAME, item, { signal: controller.signal })));
		localStorage.setItem(storageKey, Date.now());
	} catch(err) {
		controller.abort(err);
		alert(err);
	} finally {
		db.close();
	}
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

async function _addToCart(id) {
	try {
		const existing = document.querySelector(`tr[data-product-id="${id}"]`);

		if (existing instanceof HTMLTableRowElement) {
			const qty = existing.querySelector('input[name="qty"]');
			const items = structuredClone(history.state?.cart ?? []);
			const itemIndex = items.findIndex(item => item.id === id);
			items[itemIndex].qty++;
			existing.querySelector('input[name="item[qty]"]').value = items[itemIndex].qty;
			existing.querySelector('input[name="item[total]"]').value = items[itemIndex].qty * items[itemIndex].cost;
			setCart(items);
			updateTotal();
		} else {
			const product = await _getItem(id);

			if (typeof product?.id !== 'string') {
				throw new Error(`Could not find product with ID of ${id}`);
			} else {
				product.qty = 1;
				const items = structuredClone(history.state?.cart ?? []);
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
}

const submitHandler = registerCallback('pantry:checkout:submit', async event => {
	event.preventDefault();

	const resp = await fetch('/api/pantryCheckout', {
		method: 'POST',
		body: new FormData(event.target),
	}).catch(() => Response.error());

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
			const cost = row.querySelector('input[name="item[cost]"]');
			const index = cart.findIndex(item => item.id === row.dataset.productId);
			row.querySelector('input[name="item[total]"]').value = target.valueAsNumber * cost.valueAsNumber;

			if (index !== -1) {
				const tmp = structuredClone(history.state.cart);
				tmp[index].qty = target.valueAsNumber;
				setCart(tmp);
				updateTotal();
			}
		}
		break;

		case 'barcode':
			if (target.validity.valid) {
				await _addToCart(target.value);
				target.value = null;
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
			target.closest('tr').remove();
			updateTotal();
		}
		break;
	}
});

const calcTotal = () => cart.reduce((sum, item) => sum + item.cost * item.qty, 0);
const updateTotal = () => document.getElementById('cart-grand-total').textContent = calcTotal();

export default function({ signal }) {
	const sig = registerSignal(signal);

	if (! Array.isArray(history.state?.cart)) {
		setCart([]);
	}

	createStream(async result => {
		if (typeof result === 'object' && typeof result.rawValue === 'string') {
			await _addToCart(result.rawValue);
		}
	}, { signal });

	return html`<form id="scanner" ${onSubmit}="${submitHandler}" ${onChange}="${changeHandler}" ${onClick}="${clickHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${sig}">
		<fieldset class="no-border overflow-auto">
			<legend>KRV Bridge Food Pantry</legend>
			<div class="form-group">
				<label for="pantry-barcode" class="input-label">Manually Enter Barcode</label>
				<input name="barcode" id="pantry-barcode" class="input" type="search" inputmode="numeric" pattern="[0-9]{12}" autocomplete="off" placeholder="${'#'.repeat(12)}" />
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
						<td><input type="number" name="item[cost]" ${attr({ value: item.cost })} size="2" class="${numberClass}" readonly="" required="" /></td>
						<td><input type="number" name="item[qty]" min="1" max="10" size="2" class="${numberClass}" ${attr({ value: item.qty })} required="" /></td>
						<td><input type="number" name="item[total]" size="3" class="${numberClass}" ${attr({ value: item.qty * item.cost })} readonly="" required="" /></td>
						<td><button type="button" class="btn btn-danger" data-action="remove" ${data({ productId: item.id })} aria-label="Remove Item">X</button></td>
						<td class="mobile-hidden"><input type="text" name="item[id]" ${attr({ value: item.id })} readonly="" required="" /></td>
					</tr>
				`).join('')}</tbody>
				<tfoot>
					<tr>
						<td><!-- Intentionally empty --></td>
						<th colspan="3">Grand Total</th>
						<td id="cart-grand-total">${calcTotal()}</td>
						<td class="mobile-hidden"><!-- Intentionally empty --></td>
					</tr>
				</tfoot>
			</table>
		</fieldset>
		<div class="flex row no-wrap">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Empty Cart</button>
		</div>
	</form>`;
}
