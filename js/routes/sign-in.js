import { html } from '@aegisjsproject/core/parsers/html.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onSubmit, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getAllItems, clearStore, putItem } from '@aegisjsproject/idb';
import { saveFile } from '@shgysk8zer0/kazoo/filesystem.js';
import { SCHEMA } from '../consts.js';

const STORE = 'eventGuests';
const POPOVER = 'guest-popover';
const TABLE = 'guests-list';

/**
 * @param {object} config
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<IDBDatabase>}
 */
const _openDB = async ({ signal } = {}) => await openDB(SCHEMA.name, { version: SCHEMA.version,  schema: SCHEMA, signal });

const clearGuests = registerCallback('event:guests:clear', async ({ currentTarget }) => {
	const db = await _openDB();

	try {
		currentTarget.disabled = true;
		await clearStore(db, STORE);
		document.querySelector(`#${TABLE} tbody`).replaceChildren();
	} catch(err) {
		reportError(err);
	} finally {
		currentTarget.disabled = false;
		db.close();
	}
});

const downloadGuests = registerCallback('event:guests:download', async ({ currentTarget }) => {
	const db = await _openDB();

	try {
		currentTarget.disabled = true;
		const guests = await getAllItems(db, STORE);
		const fields = { givenName: 'First Name', familyName: 'Last Name', email: 'Email Address' };
		const csv = [Array.from([fields, ...guests], ({ givenName, familyName, email }) => `"${givenName}","${familyName}","${email}"`).join('\n')];
		const file = new File(
			csv,
			`${new Date().toISOString().split('T')[0]}-event.csv`,
			{ type: 'text/csv' }
		);

		saveFile(file);

	} catch(err) {
		reportError(err);
	} finally {
		currentTarget.disabled = false;
		db.close();
	}
});

const addGuest = registerCallback('event:guests:add', async event => {
	event.preventDefault();
	const { target, submitter } = event;

	try {
		submitter.disabled = true;
		const data = new FormData(target);
		const db = await _openDB();
		/**
		 * @type {HTMLTableElement}
		 */
		const table = document.getElementById(TABLE);
		const id = crypto.randomUUID();

		await putItem(db, STORE, {
			id: id,
			givenName: data.get('givenName'),
			familyName: data.get('familyName'),
			email: data.get('email'),
			datetime: new Date(),
		});

		const tr = table.tBodies.item(0).insertRow(-1);
		const fNameCell = tr.insertCell();
		const lNameCell = tr.insertCell();
		const emailCell = tr.insertCell();

		tr.id = id;
		fNameCell.textContent = data.get('givenName');
		lNameCell.textContent = data.get('familyName');
		emailCell.textContent = data.get('email');

		target.reset();
		target.hidePopover();
	} catch(err) {
		reportError(err);
	} finally {
		submitter.disabled = false;
	}
});

export default async ({ signal }) => {
	const sig = registerSignal(signal);
	const db = await _openDB({ signal });

	try {
		/* eslint-disable indent */
		const guests = html`<table id="${TABLE}">
			<thead>
				<tr>
					<th>First Name</th>
					<th>Last Name</th>
					<th>Email</th>
				</tr>
			</thead>
			<tbody>${Array.from(
				await getAllItems(db, STORE),
				({ id, givenName, familyName, email }) => `<tr ${attr({ id })}>
					<td>${givenName}</td>
					<td>${familyName}</td>
					<td>${email}</td>
				</tr>`
			).join('')}</tbody>
		</table>
		<form popover="manual" id="${POPOVER}" autocomplete="off" ${onSubmit}="${addGuest}" ${signalAttr}="${sig}">
			<fieldset autocomplete="off">
				<legend>Add Guest</legend>
				<div class="form-group">
					<label for="event-guest-given-name" class="input-label required">First Name</label>
					<div class="flex row wrap">
						<input type="text" name="givenName" id="event-guest-given-name" class="input" placeholder="First Name" autocomplete="off" required="" />
						<input type="text" name="familyName" id="event-guest-last-name" class="input" placeholder="Last Name" autocomplete="off" required="" />
					</div>
				</div>
				<div class="form-group">
					<label for="event-guest-email" class="input-label required">Email</label>
					<input type="email" name="email" id="event-guest-email" class="input" placeholder="user@example.com" autocomplete="off" required="" />
				</div>
			</fieldset>
			<div>
				<button type="submit" class="btn btn-success">Add</button>
				<button type="reset" class="btn btn-warning" popovertarget="${POPOVER}" popovertargetaction="hide">Cancel</button>
			</div>
		</form>
		<button type="button" class="btn btn-primary" popovertarget="${POPOVER}" popovertargetaction="show">Add Guest</button>
		<button type="button" class="btn btn-danger" ${onClick}="${clearGuests}" ${signalAttr}="${sig}">Clear Guest List</button>
		<button type="button" class="btn btn-secondary" ${onClick}="${downloadGuests}" ${signalAttr}="${sig}">Download</button>`;
		/* eslint-enable indent */

		db.close();

		return guests;
	} catch(err) {
		reportError(err);
		db.close();
	}
};
