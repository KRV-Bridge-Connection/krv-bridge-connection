import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { data, attr } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, onReset, onClose, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, getAllItems, deleteItem, putItem } from '@aegisjsproject/idb';
import { whenLoaded } from '@aegisjsproject/router';
import { SCHEMA } from '../consts.js';
import { createBarcodeScanner, preloadRxing, QR_CODE } from '@aegisjsproject/barcodescanner';
import { createSVGElement } from '@aegisjsproject/qr-encoder';
import { getPantryHouseholdTemplate, HOUSEHOLD_MEMBER_CLASSNAME } from '../components/pantry.js';

const PTS = [
	30, // 1
	60, // 2
	80, // 3
	95, // 4
	110, // 5
	120, // 6
	125, // 7
	130, // 8
	135, // 9
	140, //10
];

const MAX_HOUSEHOLD = PTS.length;
const BASE_POINTS = 5;
const ID = 'pantry-queue';
const STORE_NAME = 'pantryQueue';
const ADD_FORM_ID = 'pantry-queue-form';
const ADD_DIALOG_ID = 'pantry-queue-modal';
const postalCodes = {
	'alta sierra': '95949',
	'weldon': '93283',
	'bodfish': '93205',
	'south lake': '93240',
	'mt mesa': '93240',
	'mountain mesa': '93240',
	'wofford heights': '93285',
	'lake isabella': '93240',
	'kernville': '93238',
	'onyx': '93255',
	'canebrake': '93255',
	'havilah': '93518',
	'caliente': '93518',
	'squirrel mountain valley': '93240',
	'squirrel valley': '93240',
	'keyesville': '93240',
	'keysville': '93240',
};

const closeModal = registerCallback('pantry:queue:close-modal', ({ currentTarget }) => currentTarget.closest('dialog').close());

function _getPoints(household) {
	return PTS[Math.min(Math.max(parseInt(household), 1), MAX_HOUSEHOLD) - 1];
}

const closeAndRemove = registerCallback('pantry:queue:close-and-remove', async ({ currentTarget }) => {
	await removeVisit(currentTarget);
	document.getElementById(`visit-${currentTarget.dataset.id}`).remove();
	currentTarget.closest('dialog').close();
});

export const updateZip = registerCallback('pantry:queue:zip-update', ({ target: { value, form } }) => {
	const val = value.toLowerCase().replaceAll(/[^A-Za-z ]/g, '');

	if (typeof postalCodes[val] === 'string') {
		form.elements.namedItem('postalCode').value = postalCodes[val];
	}
});

/**
 * @todo Rewrite to generate JWT here instead of POSTing
 */
const submitHandler = registerCallback('pantry:queue:submit', async event => {
	event.preventDefault();
	// Store the submitter, with a default empty object just in case.
	const { submitter = {}, target } = event;
	const db = await _openDB();

	try {
		submitter.disabled = true;
		const data = new FormData(target);
		const date = new Date();
		const id = '_' + crypto.randomUUID();
		const url = new URL('/pantry/distribution', location.origin);
		const params = new URLSearchParams(data);
		const name = data.get('name')?.trim?.();

		const household = parseInt(data.get('household'));
		const normalTrip = ! data.has('extraTrip');
		const points = normalTrip ? _getPoints(household) : Math.min(Math.max(household, 1), PTS.length) * BASE_POINTS;
		params.set('name', name);
		params.set('time', date.toISOString());
		params.set('points', points);
		params.set('household', household);
		params.set('id', id);
		url.search = params;

		await putItem(db, STORE_NAME, { sub: name, txn: id, household, points, date });

		if (typeof submitter.dataset.close === 'string') {
			target.closest('dialog')?.requestClose?.();
		}
		await render();
		target.reset();
	} catch(err) {
		alert(err.message);
	} finally {
		submitter.disabled = false;
		db.close();
	}
});

const resetHandler = registerCallback('pantry:queue:reset', ({ target }) => {
	target.querySelectorAll(`.${HOUSEHOLD_MEMBER_CLASSNAME}`).forEach(el => el.remove());
});

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
			const url = new URL('/pantry/distribution', location.origin);
			const params = new URLSearchParams();
			params.set('name', visit.sub);
			params.set('id', visit.txn);
			params.set('household', visit.household);
			params.set('points', visit.points);
			params.set('date', visit.date.toISOString());
			url.search = params;
			const dialog = el`<dialog id="modal-${visit.txn}" ${onClose}="${closeHandler}">
				<p>Visit scheduled for ${visit.sub} at <time ${attr({ datetime: visit.date.toISOString() })}>${visit.date.toLocaleTimeString()}</p>
				${createSVGElement(url.href, { size: 480 })}
				<hr />
				<button type="button" class="btn btn-warning" ${onClick}="${closeModal}">Close</button>
				<button type="button" class="btn btn-danger" ${onClick}="${closeAndRemove}" ${data({ id: visit.txn })}>Close &amp; Remove</button>
			</dialog>`;

			document.getElementById('main').append(dialog);
			dialog.showModal();
		} else {
			throw new Error(`No results for ${btn.dataset.id}.`);
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
		await deleteItem(db, STORE_NAME, btn.dataset.id ?? btn.dataset.txn);
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

async function getVisit(id) {
	const db = await _openDB();

	try {
		const visit = await getItem(db, STORE_NAME, id);
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
		const rows = visits.sort(_sort).map(({ sub: name, txn: id, household, points, date}) => createVisitRow({ name, id, household, points, date}, { parse: true }));

		document.getElementById(ID).tBodies.item(0).replaceChildren(...rows);
	} finally {
		db.close();
	}
}

async function checkInVisit({ rawValue }) {
	if (URL.canParse(rawValue)) {
		const url = new URL(rawValue);

		if (url.search.length !== 0 && url.origin === location.origin || url.origin === 'https://krvbridge.org') {
			/**
			 * @type {HTMLFormElement}
			*/
			const form = document.forms[ADD_FORM_ID];
			const modal = document.getElementById(ADD_DIALOG_ID);

			url.searchParams.entries().forEach(([name, val]) => {
				const input = form.elements.namedItem(name);

				if (input instanceof HTMLElement) {
					input.value = val;
				}
			});

			modal.showModal();
		}
	}
}

preloadRxing();

function createVisitRow({ name, id, household, date }, { parse = false } = {}) {
	if (parse) {
		return html`<tr id="visit-${id}" ${data({ id })}>
			<td class="visit-name">${name}</td>
			<td class="visit-time">
				<time ${attr({ datetime: date.toISOString() })}>${date.toLocaleTimeString()}</time>
			</td>
			<td>${household}</td>
			<th>
				<button type="button" class="btn btn-primary" ${data({ txn: id })} data-queue-action="show">Show QR</button>
				<button type="button" class="btn btn-danger" ${data({ txn: id })} data-queue-action="remove">Remove</button>
			</th>
		</tr>`;
	} else {
		return `<tr id="visit-${id}" ${data({ id })}>
			<td class="visit-name">${name}</td>
			<td class="visit-time">
				<time ${attr({ datetime: date.toISOString() })}>${date.toLocaleTimeString()}</time>
			</td>
			<td>${household}</td>
			<th>
				<button type="button" class="btn btn-primary" ${data({ txn: id })} data-queue-action="show">Show QR</button>
				<button type="button" class="btn btn-danger" ${data({ txn: id })} data-queue-action="remove">Remove</button>
			</th>
		</tr>`;
	}
}

export default async ({ signal: sig, url }) => {
	const signal = registerSignal(sig);

	const { video } = await createBarcodeScanner(checkInVisit, { signal: sig, formats: [QR_CODE] });
	const db = await _openDB();
	const visits = await getAllItems(db, STORE_NAME);

	const frag = html`<button type="button" class="btn btn-primary" command="show-modal" commandfor="${ADD_DIALOG_ID}">Check-In</button>
	<details>
		<summary class="btn btn-secondary">Show Camera Feed</summary>
		<br />
	</details>
	<table id="${ID}" ${onClick}="${clickHandler}" ${signalAttr}="${signal}">
		<thead>
			<th>Name</th>
			<th>Time</th>
			<th>Household</th>
			<th>Actions</th>
		</thead>
		<tbody id="${ID}-body">
			${visits.sort(_sort).map(({ sub: name, txn: id, household, points, date }) => createVisitRow({ name, id, household, points, date })).join('')}
		</tbody>
	</table>
	<dialog id="${ADD_DIALOG_ID}">
		<form id="${ADD_FORM_ID}" autocomplete="off" ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border">
				<legend>Emergency Choice Pantry Sign-In</legend>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-name" class="input-label required">Name</label>
					<input type="text" name="name" id="${ADD_FORM_ID}-name" class="input" placeholder="Name" required="" />
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-household" class="input-label required">Household Size</label>
					<input type="number" name="household" id="${ADD_FORM_ID}-household" class="input" placeholder="##" min="1" max="${MAX_HOUSEHOLD}" required="" />
				</div>
				<div>
					<label for="${ADD_FORM_ID}-extra">Extra Trip</label>
					<input type="checkbox" name="extraTrip" />
				</div>
			</fieldset>
			<div class="flex row">
				<button type="submit" class="btn btn-success" data-close="true">Check-In &amp; Close</button>
				<button type="submit" class="btn btn-secondary">Check-In</button>
				<button type="reset" class="btn btn-danger">Reset</button>
				<button type="button" class="btn btn-warning" command="request-close" commandfor="${ADD_DIALOG_ID}">Close</button>
			</div>
		</form>
	</dialog>
	${getPantryHouseholdTemplate({ signal })}`;

	frag.querySelector('details').append(video);

	if (url.searchParams.size !== 0) {
		whenLoaded({ signal: sig }).then(() => {
			/**
			 * @type {HTMLFormElement}
			 */
			const form = document.getElementById(ADD_FORM_ID);
			const fields = form.elements;

			url.searchParams.entries().forEach(([name, value]) => Promise.try(() => fields.namedItem(name).value = value));
			document.getElementById(ADD_DIALOG_ID).showModal();
			history.replaceState(history.state ?? {}, '', new URL(location.pathname, location.origin));
		});
	}

	return frag;
};

export const title = 'Pantry Queue';
export const description = 'Sorts pantry queue';
