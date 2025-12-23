import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { data, attr } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, onReset, onChange, onClose, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getItem, getAllItems, deleteItem, putItem } from '@aegisjsproject/idb';
import { SCHEMA } from '../consts.js';
import { createBarcodeScanner, preloadRxing, QR_CODE } from '@aegisjsproject/barcodescanner';
import { fetchWellKnownKey } from '@shgysk8zer0/jwk-utils/jwk.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';
import encodeQR from 'qr';
import { TOWNS, ZIPS, postalCodes } from './pantry.js';
import { HOUSEHOLD_LIST, getPantryHouseholdTemplate, pantryAddHousehold, HOUSEHOLD_MEMBER_CLASSNAME } from '../components/pantry.js';

function createQRCode(input, {
	ecc = 'medium',
	size = 480,
	border = 4,
	scale = 4,
} = {}) {
	const gif = encodeQR(input, 'gif', { ecc, border, scale });
	const blob = new Blob([gif], { type: 'image/gif' });
	const img = document.createElement('img');
	img.height = size;
	img.width = size;
	img.src = URL.createObjectURL(blob);
	return img;
}

const ID = 'pantry-queue';
const STORE_NAME = 'pantryQueue';
const ADD_FORM_ID = 'pantry-queue-form';
const ADD_DIALOG_ID = 'pantry-queue-modal';

const key = await fetchWellKnownKey(location.origin);

const closeModal = registerCallback('pantry:queue:close-modal', ({ currentTarget }) => currentTarget.closest('dialog').close());

const closeAndRemove = registerCallback('pantry:queue:close-and-remove', async ({ currentTarget }) => {
	await removeVisit(currentTarget);
	document.getElementById(`visit-${currentTarget.dataset.txn}`).remove();
	currentTarget.closest('dialog').close();
});

export const updateZip = registerCallback('pantry:queue:zip-update', ({ target: { value, form } }) => {
	const val = value.toLowerCase().replaceAll(/[^A-Za-z ]/g, '');

	if (typeof postalCodes[val] === 'string') {
		form.elements.namedItem('postalCode').value = postalCodes[val];
	}
});

const submitHandler = registerCallback('pantry:queue:submit', async event => {
	event.preventDefault();
	// Store the submitter, with a default empty object just in case.
	const submitter = event.submitter ?? {};

	try {
		submitter.disabled = true;
		const data = new FormData(event.target);
		data.set('datetime', new Date(data.get('date') + 'T' + data.get('time')).toISOString());

		const resp = await fetch('/api/pantry', {
			method: 'POST',
			body: data,
		});

		if (resp.ok) {
			const body = await resp.formData();
			const jwt = body.get('jwt');
			await checkInVisit({ rawValue: jwt });
			event.target.reset();
			submitter.disabled = false;
		} else {
			const err = await resp.json();
			throw new Error(err.error.message);
		}
	} catch(err) {
		alert(err.message);
		submitter.disabled = false;
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
			const qr = createQRCode(visit.jwt, { size: 480 });
			const id = 'qr-' + crypto.randomUUID();
			const blob = qr.src;
			qr.id = id;

			const dialog = el`<dialog id="modal-${visit.txn}" ${onClose}="${closeHandler}">
				<p>Visit scheduled for ${visit.sub} at <time ${attr({ datetime: visit.date.toISOString() })}>${visit.date.toLocaleTimeString()}</p>
				${qr.outerHTML}
				<hr />
				<button type="button" class="btn btn-warning" ${onClick}="${closeModal}">Close</button>
				<button type="button" class="btn btn-danger" ${onClick}="${closeAndRemove}" ${data({ txn: visit.txn })}>Close &amp; Remove</button>
			</dialog>`;

			dialog.addEventListener('close', () => URL.revokeObjectURL(blob), { once: true });

			document.getElementById('main').append(dialog);
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
	const now = Math.floor(Date.now() / 1000);

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
	} else {
		const {
			sub,
			toe,
			txn,
			authorization_details: { household, points },
		} = await verifyJWT(rawValue, key);

		const db = await _openDB();

		try {
			const date = now > toe ? new Date() : new Date(toe * 1000);
			await putItem(db, STORE_NAME, { sub, txn, household, points, date, checkedIn: new Date(), jwt: rawValue });
			await render();
		} finally {
			db.close();
		}
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

	const frag = html`<button type="button" class="btn btn-primary" command="show-modal" commandfor="${ADD_DIALOG_ID}">Check-In</button>
	<details>
		<summary class="btn btn-secondary">Show Camera Feed</summary>
		<br />
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
	</table>
	<dialog id="${ADD_DIALOG_ID}">
		<form id="${ADD_FORM_ID}" autocomplete="off" ${onSubmit}="${submitHandler}" ${onReset}="${resetHandler}" ${signalAttr}="${signal}">
			<fieldset class="no-border">
				<legend>Emergency Choice Pantry Sign-In</legend>
				<div class="form-group flex wrap space-between">
					<span>
						<label for="${ADD_FORM_ID}-given-name" class="input-label required">First Name</label>
						<input type="text" name="givenName" id="${ADD_FORM_ID}-given-name" class="input" placeholder="First name" required="" />
					</span>
					<span>
						<label for="${ADD_FORM_ID}-additional-name" class="input-label">Middle Name</label>
						<input type="text" name="additionalName" id="${ADD_FORM_ID}-additional-name" class="input" placeholder="Middle name" />
					</span>
					<span>
						<label for="${ADD_FORM_ID}-family-name" class="input-label required">Last Name</label>
						<input type="text" name="familyName" id="${ADD_FORM_ID}-family-name" class="input" placeholder="Last name" required="" />
					</span>
					<span>
						<label for="${ADD_FORM_ID}-name-suffix" class="input-label">Suffix</label>
						<input type="text"
							name="suffix"
							id="${ADD_FORM_ID}-name-suffix"
							class="input"
							list="${ADD_FORM_ID}-suffix-options"
							size="3"
							minlength="2"
							placeholder="Jr., Sr., III, etc." />
						<datalist id="${ADD_FORM_ID}-suffix-options">
							<option value="Jr">
							<option value="Sr">
							<option value="II">
							<option value="III">
							<option value="IV">
						</datalist>
					</span>
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-email" class="input-label">Email</label>
					<input type="email" name="email" id="${ADD_FORM_ID}-email" class="input" placeholder="user@example.com" />
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-phone" class="input-label">Phone</label>
					<input type="tel" name="telephone" id="${ADD_FORM_ID}-phone" class="input" placeholder="555-555-5555" />
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-street-address" class="input-label">Address</label>
					<input type="text" name="streetAddress" id="${ADD_FORM_ID}-street-address" class="input" placeholder="Street Address" />
					<label for="${ADD_FORM_ID}-address-locality" class="input-label required">City</label>
					<input type="text" name="addressLocality" id="${ADD_FORM_ID}-address-locality" class="input" placeholder="Town" list="${ADD_FORM_ID}-towns-list" ${onChange}="${updateZip}" ${signalAttr}="${signal}" required="" />
					<datalist id="${ADD_FORM_ID}-towns-list">
						${TOWNS.map(town => `<option label="${town}" value="${town}"></option>`).join('\n')}
					</datalist>
					<label for="${ADD_FORM_ID}-postal-code" class="input-label required">Zip Code</label>
					<input type="text" name="postalCode" id="${ADD_FORM_ID}-postal-code" class="input" pattern="\d{5}" inputmode="numeric" minlength="5" maxlength="5" placeholder="#####" list="${ADD_FORM_ID}-postal-list" required="" />
					<datalist id="${ADD_FORM_ID}-postal-list">
						${ZIPS.map(code => `<option value="${code}" label="${code}"></option>`).join('\n')}
					</datalist>
				</div>
				<!--<div class="form-group">
					<label for="${ADD_FORM_ID}-household-size" class="input-label required">How Many People Will This Feed?</label>
					<input type="number" name="household" id="${ADD_FORM_ID}-household-size" class="input" placeholder="##" min="1" max="8" inputmode="numeric" required="" />
				</div>-->
				<div>
					<p>Please provide the names for all of the people other than yourself this will be feeding</p>
					<ol id="${HOUSEHOLD_LIST}" class="form-group"></ol>
					<button type="button" class="btn btn-primary btn-lg" ${onClick}="${pantryAddHousehold}" ${signalAttr}="${sig}">
						<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" class="icon" role="presentation" aria-hidden="true">
							<path fill-rule="evenodd" d="M12 9H7v5H5V9H0V7h5V2h2v5h5v2z"/>
						</svg>
						<span>Add Household Member</span>
					</button>
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-date" class="input-label required">Pick a Date</label>
					<input type="date" name="date" id="${ADD_FORM_ID}-date" class="input" ${attr({ value: new Date().toISOString().split('T')[0]})} required="" />
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-time" class="input-label required">Pick a Time</label>
					<input type="time" name="time" id="${ADD_FORM_ID}-time" class="input" min="08:00" max="17:00" required="" />
				</div>
				<div class="form-group">
					<label for="${ADD_FORM_ID}-comments" class="input-label">
						<span>Additional Resource Request</span>
						<p>Are there any other resouces that you may be seeking? Any circumstances that our network of partners may be able to assist you with?</p>
					</label>
					<textarea name="comments" id="${ADD_FORM_ID}-comments" class="input" placeholder="Please describe any other needs or support you are looking for." cols="40" rows="5"></textarea>
				</div>
			</fieldset>
			<div class="flex row">
				<button type="submit" class="btn btn-success">Check-In</button>
				<button type="reset" class="btn btn-danger">Reset</button>
				<button type="button" class="btn btn-warning" command="request-close" commandfor="${ADD_DIALOG_ID}">Close</button>
			</div>
		</form>
	</dialog>
	${getPantryHouseholdTemplate({ signal })}`;

	frag.querySelector('details').append(video);

	return frag;
};

export const title = 'Pantry Queue';
export const description = 'Sorts pantry queue';
