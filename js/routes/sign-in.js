import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onCommand, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { openDB, getAllItems, clearStore, putItem } from '@aegisjsproject/idb';
import { saveFile } from '@shgysk8zer0/kazoo/filesystem.js';
import { confirm } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { SCHEMA } from '../consts.js';

const STORE = 'eventGuests';
const POPOVER = 'guest-popover';
const TABLE = 'guests-list';
const EMAIL = 'event-guest-email';

/**
 * @param {object} config
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<IDBDatabase>}
 */
const _openDB = async ({ signal } = {}) => await openDB(SCHEMA.name, { version: SCHEMA.version,  schema: SCHEMA, signal });

const clearGuests = async () => {
	const db = await _openDB();

	try {

		if (await confirm('Are you sure you want to clear sign-ins?')) {
			await clearStore(db, STORE);
			document.querySelector(`#${TABLE} tbody`).replaceChildren();
		}
	} catch(err) {
		reportError(err);
	} finally {
		db.close();
	}
};

export function escapeCSV(strings, ...values) {
	return String.raw(strings, ...values.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`));
}

const downloadGuests = async () => {
	const db = await _openDB();

	try {
		const guests = await getAllItems(db, STORE);
		const fields = { givenName: 'First Name', familyName: 'Last Name', email: 'Email Address' };
		const csv = [Array.from([fields, ...guests], ({ givenName, familyName, email }) => escapeCSV`${givenName},${familyName},${email}`).join('\n')];
		const file = new File(
			csv,
			`${new Date().toISOString().split('T')[0]}-event.csv`,
			{ type: 'text/csv' }
		);

		saveFile(file);

	} catch(err) {
		reportError(err);
	} finally {
		db.close();
	}
};

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

document.adoptedStyleSheets = [
	...document.adoptedStyleSheets,
	css`
		#${POPOVER}:popover-open {
			border: none;
			border-radius: 6px;
			padding: 1.2em;

			.flex {
				gap: 1em;

				.input {
					width: auto;
					max-width: unset;
					flex: 1 1 45%;
				}
			}
		}
	`,
];

const resetHandler = registerCallback('event:guest:reset', ({ target }) => target.hidePopover());

const commandHandler = registerCallback('event:guest:command', async ({ source, command }) => {
	try {
		source.disabled = true;

		switch(command) {
			case '--download-guests':
				await downloadGuests();
				break;

			case '--clear-guests':
				await clearGuests();
				break;
		}
	} catch(err) {
		reportError(err);
	} finally {
		source.disabled = false;
	}
});

export default async ({ signal }) => {
	const sig = registerSignal(signal);
	const db = await _openDB({ signal });

	try {
		/* eslint-disable indent */
		const guests = html`<div id="event-guest-list" popover="auto" ${onCommand}="${commandHandler}" ${signalAttr}="${sig}">
			<table id="${TABLE}">
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
			<div class="flex row wrap space-evenly">
				<button type="button" class="btn btn-warning" command="hide-popover" commandfor="event-guest-list">Dismiss</button>
				<button type="button" class="btn btn-danger" command="--clear-guests" commandfor="event-guest-list">Clear Guest List</button>
				<button type="button" class="btn btn-secondary" command="--download-guests" commandfor="event-guest-list">Download</button>
			</div>
		</div>
		<form popover="manual" id="${POPOVER}" autocomplete="off" ${onSubmit}="${addGuest}" ${onReset}="${resetHandler}" ${signalAttr}="${sig}">
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
					<label for="${EMAIL}" class="input-label">Email</label>
					<input type="email" name="email" id="${EMAIL}" class="input" placeholder="user@example.com" autocomplete="off" />
				</div>
			</fieldset>
			<div>
				<button type="submit" class="btn btn-success">Add</button>
				<button type="reset" class="btn btn-danger">Cancel</button>
			</div>
		</form>
		<button type="button" class="btn btn-primary" commandfor="${POPOVER}" command="show-popover" accesskey="a">Add Guest</button>
		<button type="button" class="btn btn-secondary" commandfor="event-guest-list" command="show-popover" accesskey="s">Show Guests</button>`;
		/* eslint-enable indent */

		db.close();

		return guests;
	} catch(err) {
		reportError(err);
		db.close();
	}
};
