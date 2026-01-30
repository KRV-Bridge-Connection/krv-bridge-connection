import { genOrgToken } from '/js/firebase/user.js';

const fields = ['name', 'email', 'phone', 'skills', 'interests'];

function createLink(field, type) {
	const a = document.createElement('a');

	a.href = type === 'email' ? `mailto:${field}` : `tel:${field}`;
	a.textContent = field;
	return a;
}

export default async ({ signal }) => {
	await genOrgToken();
	const resp = await fetch('/api/volunteer', {
		headers: { Accept: 'application/json' },
		signal,
	}).catch(() => Response.error());

	if (! resp.ok) {
		const btn = document.createElement('a');
		const url = new URL('/account/sign-in', location.origin);
		url.searchParams.set('redirect', location.href);
		btn.href = url.href;
		btn.classList.add('btn', 'btn-primary');
		btn.textContent = 'Sign-In';
		return btn;
	} else {
		const volunteers = await resp.json();
		const table = document.createElement('table');
		const tHead = table.createTHead();
		const tBody = table.createTBody();
		const row = tHead.insertRow();

		for (const field of fields) {
			const th = document.createElement('th');
			th.textContent = field;
			row.append(th);
		}

		for (const volunteer of volunteers) {
			const row = tBody.insertRow();

			for (const field of fields) {
				const cell = row.insertCell();

				if (field === 'phone' || field === 'email') {
					cell.append(createLink(volunteer[field], field));
				} else {
					cell.textContent = Array.isArray(volunteer[field]) ? volunteer[field].join(', ') : volunteer[field];
				}
			}
		}

		table.border = '1';
		return table;
	}
};
