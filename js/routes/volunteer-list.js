import { genOrgToken } from '/js/firebase/user.js';
import { whenLoaded, navigate } from '@aegisjsproject/router';

const fields = ['name', 'email', 'phone', 'skills', 'interests'];
const tableClass = '_' + crypto.randomUUID();

new CSSStyleSheet({ media: 'screen' }).replace(`.${tableClass} {
    --base-bg: light-dark(#ffffff, #1e1e1e);
    --base-text: light-dark(#333333, #dddddd);
    --accent: light-dark( #2b2bd2, #4d51b6);
    --tbl-border: color-mix(in srgb, var(--base-text), transparent 80%);
    --tbl-stripe: color-mix(in srgb, var(--base-text) 4%, var(--base-bg));
    --tbl-hover: color-mix(in srgb, var(--base-text) 8%, var(--base-bg));

    border-collapse: collapse;
    width: 100%;
    font-family: system-ui, sans-serif;
    font-size: 0.95rem;

	& caption {
        padding: 1rem;
        font-weight: bold;
        font-size: 1.1rem;
        text-align: left;
        color: var(--base-text);
        caption-side: top;
        border-bottom: 2px solid var(--accent);
        margin-bottom: 0.5rem;
}

    & th, & td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid var(--tbl-border);
        color: var(--base-text);
    }

    & thead th {
        position: sticky;
        top: var(--nav-height, 4rem);
        z-index: 1;

        background-color: var(--accent);
        color: #ffffff;
        font-weight: bold;
        border-bottom: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    & tfoot {
        background-color: color-mix(in srgb, var(--tbl-stripe), var(--base-text) 5%);
        font-weight: bold;

        & td {
            color: var(--base-text);
            border-top: 2px solid var(--accent);
        }
    }

    & tbody {
        & tr {
            transition: background-color 0.2s ease;

            &:nth-of-type(even) {
                background-color: var(--tbl-stripe);
            }

            &:hover {
                background-color: var(--tbl-hover);
                cursor: default;
            }

            &.active-row {
                color: var(--accent);
                font-weight: bold;
            }
        }
    }
}`).then(sheet => document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]);

function createLink(field, type) {
	const a = document.createElement('a');

	a.href = type === 'email' ? `mailto:${field}` : `tel:${field}`;
	a.textContent = field;
	return a;
}

export default async ({ signal }) => {
	await genOrgToken(); // Sets an HTTP-Only cookie with a JWT with a 30 minute TTL
	const resp = await fetch('/api/volunteer', {
		headers: { Accept: 'application/json' },
		signal,
	}).catch(() => Response.error());

	if (! resp.ok) {
		const btn = document.createElement('a');
		const url = new URL('/account/sign-in', location.origin);
		const { promise, resolve } = Promise.withResolvers();
		url.searchParams.set('redirect', location.href);
		btn.href = url.href;
		btn.classList.add('btn', 'btn-primary');
		btn.textContent = 'Sign-In';

		if (resp.headers.get('Content-Type')?.startsWith('application/json')) {
			resp.json().then(err => {
				const dialog = document.createElement('dialog');
				const p = document.createElement('p');
				const close = document.createElement('button');

				close.type = 'button';
				close.classList.add('btn', 'btn-danger');
				close.command = 'request-close';
				close.commandForElement = dialog;
				close.textContent = 'Dismiss';
				p.textContent = err?.error?.message ?? 'An unknown error occured';

				dialog.addEventListener('close', ({ target }) => {
					target.remove();
					resolve();
				}, { signal, once: true });

				dialog.append(p, close);
				document.body.append(dialog);
				dialog.showModal();
			});
		} else {
			resolve();
		}

		whenLoaded({ signal }).then(() => promise).then(() => navigate(btn.href, history.state ?? {}, { signal }));

		return btn;
	} else {
		const volunteers = await resp.json();
		const table = document.createElement('table');
		const tHead = table.createTHead();
		const tBody = table.createTBody();
		const row = tHead.insertRow();
		const caption = table.createCaption();
		table.classList.add(tableClass);
		caption.textContent = 'KRV Volunteers Registry';

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

		return table;
	}
};

export const title = 'KRV Volunteers Registrations';

export const description = 'A list of volunteers for KRV Events/Orgs';
