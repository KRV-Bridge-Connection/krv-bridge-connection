import { manageState } from '@aegisjsproject/state';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onChange, onSubmit, onReset, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, putItem } from '@aegisjsproject/idb';
import { alert } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { SCHEMA } from '../consts.js';

export const title = 'KRV Bridge Pantry Distribution';
export const description = 'Internal app to record food distribution.';

const numberClass = 'small-numeric';
const storageKey = '_lastSync:pantry:inventory';
const STORE_NAME = 'inventory';
const BARCODE_FORMATS = ['upc_a'];
const FRAME_RATE = 12;
const UPC_A_PATTERN = /^\d{12}$/;
const PANTRY_ENDPOINT = new URL('/api/pantryDistribution', location.origin).href;
const SCAN_DELAY = 1000;
const [cart, setCart] = manageState('cart', []);

const _convertItem = ({ updated, ...data }) => ({ updated: new Date(updated._seconds * 1000), ...data });
const _calcTotal = () => cart.reduce((sum, item) => sum + item.cost * item.qty, 0);
const _updateTotal = () => scheduler.yield().then(() => document.getElementById('cart-grand-total').textContent = _calcTotal());

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
	}

	#cart-grand-total {
		font-weight: 800;
		font-size: 1.2rem;
		text-decoration: underline;
	}`,
];

function playChime() {
	const ctx = new AudioContext();
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = 'sine';
	osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1kHz ding
	gain.gain.setValueAtTime(0.2, ctx.currentTime); // Adjust volume

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start();
	osc.stop(ctx.currentTime + 0.2); // Short chime
}

async function createBarcodeReader(cb = console.log, {
	delay = SCAN_DELAY,
	facingMode = 'environment',
	formats = BARCODE_FORMATS,
	frameRate = FRAME_RATE,
	signal,
} = {}) {
	const { promise, resolve, reject } = Promise.withResolvers();

	if (! ('BarcodeDetector' in globalThis)) {
		reject(new DOMException('`BarcodeDetector` is not supported.'));
	} else if (signal instanceof AbortSignal && signal.aborted) {
		reject(signal.reason);
	} else {
		let frame = NaN;
		const controller = new AbortController();
		const sig = signal instanceof AbortSignal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
		const scanner = new globalThis.BarcodeDetector({ formats });
		const wakeLock = 'wakeLock' in navigator ? await navigator.wakeLock.request('screen').catch(() => undefined) : undefined;
		const video = document.createElement('video');
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: { frameRate, facingMode },
		});

		video.srcObject = stream;
		video.play();

		const canvas = new OffscreenCanvas(640, 480);
		const ctx = canvas.getContext('2d');

		async function drawFrame() {
			try {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				const results = await scanner.detect(ctx.canvas).catch(err => {
					reportError(err);
					return [];
				});

				if (results.length !== 0) {
					playChime();
					await Promise.allSettled(results.map(cb));
					await new Promise(resolve => setTimeout(resolve, delay));
				}

				if (! sig.aborted) {
					frame = video.requestVideoFrameCallback(drawFrame);
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
			resolve(controller);
			drawFrame();
		}, { once: true, signal: sig });

		sig.addEventListener('abort', async () => {
			video.cancelVideoFrameCallback(frame);
			video.pause();
			ctx.reset();
			stream.getTracks().forEach(track => track.stop());

			if (typeof wakeLock === 'object') {
				await wakeLock.release();
			}
		}, { once: true });
	}

	return promise;
}

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

function _createItemRow(item) {
	return html`<tr ${data({ productId: item.id })}>
		<td><input type="text" name="item[name]" ${attr({ value: item.name })} readonly="" required="" /></td>
		<td><input type="number" name="item[cost]" ${attr({ value: item.cost })} size="2" class="${numberClass}" readonly="" required="" /></td>
		<td><input type="number" name="item[qty]" min="1" max="10" size="2" class="${numberClass}" ${attr({ value: item.qty ?? 1 })} required="" /></td>
		<td><input type="number" name="item[total]" size="3" class="${numberClass}" ${attr({ value: (item.qty ?? 1) * item.cost })} readonly="" required="" /></td>
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

async function _addToCart(id) {
	try {
		if (typeof id !== 'string') {
			throw new TypeError('Invalid product ID.');
		} else if (id.length > 12) {
			id = id.substring(id.length - 12);
		} else if (id.length !== 12) {
			throw new TypeError(`Invalid product ID length for ${id}.`);
		}

		const existing = document.querySelector(`tr[data-product-id="${id}"]`);

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
				const items = structuredClone(history.state?.cart ?? []);
				items.push(product);
				setCart(items);
				const row = _createItemRow(product);
				await scheduler.yield();
				document.getElementById('pantry-cart').tBodies.item(0).append(row);
				_updateTotal();

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
});

const resetHandler = registerCallback('pantry:distribution:reset', () =>{
	setCart([]);
	document.querySelector('#pantry-cart tbody').replaceChildren();
	_updateTotal();
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
				await _addToCart(result.rawValue);
			}
		}, { signal });
	}

	return html`<search>
		<form id="barcode-entry" ${onSubmit}="${barcodeHandler}" ${signalAttr}="${sig}">
			<div class="form-group">
				<label for="pantry-barcode" class="input-label">Manually Enter Barcode</label>
				<input name="barcode" id="pantry-barcode" class="input" type="search" inputmode="numeric" pattern="[0-9]{12}" minlength="12" maxlength="12" autocomplete="off" placeholder="${'#'.repeat(12)}" required="" />
			</div>
			<button type="submit" class="btn btn-success">Search</button>
			<button type="reset" class="btn btn-reject">Clear</button>
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
						<td id="cart-grand-total">${_calcTotal()}</td>
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
