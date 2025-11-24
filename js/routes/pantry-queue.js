import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { data, attr } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onClose, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, getAllItems, deleteItem, putItem } from '@aegisjsproject/idb';
import { SCHEMA } from '../consts.js';
import { createBarcodeScanner, preloadRxing, QR_CODE } from '@aegisjsproject/barcodescanner';
import { fetchWellKnownKey } from '@shgysk8zer0/jwk-utils/jwk.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';
import { createQRCode } from '@shgysk8zer0/kazoo/qr.js';

const ID = 'pantry-queue';
const STORE_NAME = 'pantryQueue';

const key = await fetchWellKnownKey(location.origin);

const _openDB = async () => await openDB(SCHEMA.name, {
	version: SCHEMA.version,
	schema: SCHEMA,
});

const _sort = (a, b) => (a.date - b.date) || (a.checkedIn - b.checkedIn);

const closeHandler = registerCallback('pantry:queue:close', ({ currentTarget }) => currentTarget.remove());

async function showVisit(btn) {
	btn.disabled = true;

	try {
		const visit = await getVisit(btn.dataset.txn);

		if (typeof visit === 'object') {
			// const qr = createQRCode(visit.jwt, { size: 480, margin: 7 });
			const dialog = el`<dialog id="modal-${visit.txn}" ${onClose}="${closeHandler}">
				<p>Visit scheduled for ${visit.sub} at <time ${attr({ datetime: visit.date.toISOString() })}>${visit.date.toLocaleTimeString()}</p>
				${createQRCode(visit.jwt, { size: 480, margin: 7 })}
				<hr />
				<button type="button" class="btn btn-danger" command="close" commandfor="modal-${visit.txn}">Close</button>
			</dialog>`;

			document.body.append(dialog);
			dialog.showModal();
		} else {
			throw new Error(`No results for ${btn.dataset.txn}.`);
		}
	} catch(err) {
		reportError(err);
	} finally {
		btn.disabled = false;
	}
}

async function removeVisit(btn) {
	//deleteItem
	btn.disabled = true;
	const db = await _openDB();

	try {
		const row = btn.closest('tr');
		await deleteItem(db, STORE_NAME, btn.dataset.txn);
		row.remove();
	} catch(err) {
		reportError(err);
	} finally {
		db.close();
		btn.disabled = false;
	}
}

const clickHandler = registerCallback('pantry:queue:show', async event => {
	if (event.target instanceof HTMLButtonElement && event.target.hasAttribute('data-txn') && event.target.hasAttribute('data-queue-action')) {
		switch(event.target.dataset.queueAction) {
			case 'show':
				await showVisit(event.target);
				break;

			case 'remove':
				await removeVisit(event.target);
				break;
		}
	}
});

async function getVisit(txn) {
	const db = await _openDB();

	try {
		const visit = await getItem(db, STORE_NAME, txn);
		db.close();
		return visit;
	} catch (err) {
		alert(err);
		db.close();
	}
}

async function render() {
	const db = await _openDB();

	try {
		const visits = await getAllItems(db, STORE_NAME);
		const rows = visits.sort(_sort).map(v => createVisitRow(v, { parse: true }));

		document.getElementById(ID).tBodies.item(0).replaceChildren(...rows);
	} finally {
		db.close();
	}
}

async function checkInVisit({ rawValue }) {
	const {
		sub,
		toe,
		txn,
		authorization_details: { household },
	} = await verifyJWT(rawValue, key);
	const db = await _openDB();

	try {
		const date = new Date(toe * 1000);
		await putItem(db, STORE_NAME, { sub, txn, household, date, checkedIn: new Date(), jwt: rawValue });
		await render();
	} finally {
		db.close();
	}
}

preloadRxing();

function createVisitRow({ sub, txn, household, date, checkedIn }, { parse = false } = {}) {
	if (parse) {
		return html`<tr id="visit-${txn}" ${data({ txn })}>
			<td class="visit-name">${sub}</td>
			<td class="visit-time">
				<time ${attr({ datetime: date.toISOString() })}>${date.toLocaleTimeString()}</time>
			</td>
			<td class="visit-check-in">
				<time ${attr({ datetime: checkedIn.toISOString() })}>${checkedIn.toLocaleTimeString()}</time>
			</td>
			<td>${household}</td>
			<th>
				<button type="button" class="btn btn-primary" ${data({ txn })} data-queue-action="show">Show QR</button>
				<button type="button" class="btn btn-danger" ${data({ txn })} data-queue-action="remove">Remove</button>
			</th>
		</tr>`;
	} else {
		return `<tr id="visit-${txn}" ${data({ txn })}>
			<td class="visit-name">${sub}</td>
			<td class="visit-time">
				<time ${attr({ datetime: date.toISOString() })}>${date.toLocaleTimeString()}</time>
			</td>
			<td class="visit-check-in">
				<time ${attr({ datetime: checkedIn.toISOString() })}>${checkedIn.toLocaleTimeString()}</time>
			</td>
			<td>${household}</td>
			<th>
				<button type="button" class="btn btn-primary" ${data({ txn })} data-queue-action="show">Show QR</button>
				<button type="button" class="btn btn-danger" ${data({ txn })} data-queue-action="remove">Remove</button>
			</th>
		</tr>`;
	}
}

export default async ({ signal: sig }) => {
	const signal = registerSignal(sig);

	const { video } = await createBarcodeScanner(checkInVisit, { signal: sig, formats: [QR_CODE] });
	const db = await _openDB();
	const visits = await getAllItems(db, STORE_NAME);

	const frag = html`<details>
		<summary class="btn btn-secondary">Show Camera Feed</summary>
	</details>
	<table id="${ID}" ${onClick}="${clickHandler}" ${signalAttr}="${signal}">
		<thead>
			<th>Name</th>
			<th>Time</th>
			<th>Check-In</th>
			<th>Household</th>
			<th>Actions</th>
		</thead>
		<tbody id="${ID}-body">
			${visits.sort(_sort).map(createVisitRow).join('')}
		</tbody>
	</table>`;

	frag.querySelector('details').append(video);

	return frag;
};
