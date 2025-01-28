import { site, SCHEMA } from '../consts.js';
import { getAllItems, getItem, getStoreReadWrite, handleIDBRequest, openDB } from '@aegisjsproject/idb';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, onChange, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { manageSearch } from '@aegisjsproject/url/search.js';

const style = css`.partner-image {
	max-width: 100%;
	height: auto;
	background-color: #fafafa;
	background-color: light-dark(transparent, #fafafa);
	padding: 0.3em;
	border-radius: 4px;
}

.card.org-card {
	border-color: #dadada;
	border-color: light-dark(#dadada, rgb(73, 80, 87));
	margin-bottom: 0.5em;
}

.org-card .partner-name {
	font-size: 1.4em;
	font-weight: 700;
	margin-bottom: 0.3em;
}

.org-card .btn-lg {
	min-width: 11em;
}`;

document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];

const cache = new Map();
const STORE_NAME = 'partners';
// const DB_TTL = 604800000; // 1 week
const DB_TTL = 86400000; // 1 Day
const [search, setSearch] = manageSearch('search', '');
const hide = (val, param) => ! val.toLowerCase().includes(param.toString().toLowerCase());

const needsSync = (ttl = DB_TTL) => localStorage.hasOwnProperty('_lastSync')
	? Date.now() - (parseInt(localStorage.getItem('_lastSync')) || 0) > ttl
	: true;

async function syncDB(db, { signal } = {}) {
	if (needsSync(DB_TTL)) {
		try {
			const url = new URL('/api/partners', location.origin);
			url.searchParams.set('lastUpdated', new Date(localStorage.getItem('_lastSync') ?? '0').toISOString());

			const resp = await fetch(url, {
				headers: { Accept: 'application/json' },
				referrerPolicy: 'no-referrer',
				credentials: 'omit',
				priority: 'high',
				signal,
			});

			if (resp.ok) {
				const partners = await resp.json();
				const store = await getStoreReadWrite(db, STORE_NAME, {});

				await Promise.all(partners.map(partner => {
					partner.lastUpdated = new Date(partner.lastUpdated);
					return handleIDBRequest(store.put(partner), { signal });
				}));

				localStorage.setItem('_lastSync', Date.now());
			} else {
				throw new DOMException(`${resp.url} [${resp.status}]`, 'NotFound');
			}
		} catch(err) {
			reportError(err);
		}
	}
}

const updateSearch = registerCallback('partner:search:change', ({ target }) => {
	if (typeof target.value !== 'string' || target.value.length === 0) {
		target.form.reset();
	} else {
		setSearch(target.value);
		target.form.requestSubmit();
	}
});

const searchPartners = registerCallback('partner:search:submit', event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const search = data.get('search').toLowerCase().trim();

	if (search.length === 0) {
		document.querySelectorAll('[data-org-name]').forEach(el => el.hidden = false);
	} else {
		document.querySelectorAll('[data-org-name]').forEach(el => {
			el.hidden = ! el.dataset.orgName.toLowerCase().includes(search);
		});
	}
});

const resetPartnerSearch = registerCallback('partner:reset', () => {
	document.getElementById('search-orgs').removeAttribute('value');
	setSearch();
	document.querySelectorAll('[data-org-name]').forEach(el => el.hidden = false);
});

export async function getMetadata({ matches, signal } = {}) {
	if (typeof matches.pathname.groups.partner === 'string' && matches.pathname.groups.partner.length !== 0) {
		const {
			name: title = 'Not Found',
			description = `No results for ${matches.pathname.groups.partner.replaceAll('-', ' ')}`,
		} = await getPartnerInfo(matches, { signal }).catch(({ message }) => ({
			name: `Not results for ${matches.pathname.groups.partner.replaceAll('-', ' ')}`,
			description: message,
		}));

		return { title, description };
	} else {
		return {
			title: 'Partner Directory',
			description: 'A directory of KRV Bridge Connection partner organizations serving the Kern River Valley.',
		};
	}
}

async function getPartnerInfo({
	pathname: {
		groups: { partner = null } = {},
	} = {},
}, { signal }) {
	const { promise, resolve, reject } = Promise.withResolvers();

	if (typeof partner !== 'string') {
		reject(new Error('No partner specified'));
	} else if (cache.has(partner)) {
		resolve(cache.get(partner));
	} else {
		cache.set(partner, promise);
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version });

		getItem(db, STORE_NAME, partner, { signal })
			.then(result => typeof result === 'undefined'
				? reject(new DOMException(`No results found for ${partner.replaceAll('-', ' ')}`, 'NotFoundError'))
				: resolve(result)
			)
			.catch(cause => reject(new Error(`Error getting ${partner}`, { cause })))
			.finally(db.close.bind(db));
	}

	return promise;
}

export default async function ({ matches, signal } = {}) {
	if (typeof matches?.pathname?.groups?.partner === 'string' && matches.pathname.groups.partner.length !== 0) {
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });
		await syncDB(db, { signal });
		db.close();
		const result = await getPartnerInfo(matches, { signal }).catch(err => err);

		if (result instanceof Error) {
			return html`<div class="status-box error">${result.message}</div>`;
		} else if (typeof result === 'object') {
			return html`<div class="org-info" itemtype="https://schema.org/${result['@type'] ?? 'Organization'}" ${data({ orgName: result.name })} itemscope="">
				<h2>
					<span itemprop="name">${result.name}</span>
				</h2>
				<img ${attr({ src: result.image.src, height: result.image.height, width: result.image.width, alt: result.name })} class="block full-width partner-image" itemprop="image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
				<p itemprop="description">${result.description}</p>

				${typeof result.email !== 'string' ? '' : `<a ${attr({ href: 'mailto:' + result.email })} itemprop="email" class="btn btn-link btn-lg">
					<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Email">
						<use xlink:href="/img/icons.svg#mail"></use>
					</svg>
					<span>${result.email}</span>
				</a>`}

				${typeof result.telephone !== 'string' ? '' : `<a ${attr({ href: 'tel:' + result.telephone })} itemprop="telephone" class="btn btn-link btn-lg">
					<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Call">
						<use xlink:href="/img/icons.svg#call-start"></use>
					</svg>
					<span>${result.telephone.replace('+1-', '')}</span>
				</a>`}

				${typeof result.url !== 'string' && URL.canParse(result.url) ? '' : `<a ${attr({ href: result.url })} target="_blank" itemprop="url" rel="noopener noreferrer external" class="btn btn-link btn-lg">
					<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Website">
						<use xlink:href="/img/icons.svg#link-external"></use>
					</svg>
					<span>${new URL(result.url).hostname}</span>
				</a>`}
			</div>`;
		} else {
			return html`<h2>Not Found</h2>`;
		}
	} else {
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });
		await syncDB(db, { signal });
		const results = await getAllItems(db, STORE_NAME, null, { signal });
		const sig = registerSignal(signal);

		return html`<search>
			<form id="org-search" ${onSubmit}="${searchPartners}" ${onReset}="${resetPartnerSearch}" ${signalAttr}="${sig}">
				<div class="form-group">
					<label for="search-orgs" class="visually-hidden">Search Organizations</label>
					<input type="search" name="search" id="search-orgs" class="input" placeholder="Search form..." autocomplete="off" ${attr({ value: search })} ${onChange}="${updateSearch}" ${signalAttr}=${sig} list="org-names" required="" />
					<datalist id="org-names">
						${results.map(({ name }) => `<option ${attr({ label: name, value: name })}></option>`).join('\n')}
					</datalist>
					<br />
					<button type="submit" class="btn btn-success">
						<svg clas="icon" height="18" width="18" fill="currentColor" aria-hidden="true">
							<use xlink:href="/img/icons.svg#search"></use>
						</svg>
						<span>Search</span>
					</button>
					<button type="reset" class="btn btn-danger">
						<svg clas="icon" height="18" width="18" fill="currentColor" aria-hidden="true">
							<use xlink:href="/img/icons.svg#x"></use>
						</svg>
						<span>Reset</span>
					</button>
				</div>
			</form>
		</search>
		<div>
			${results.map(({ name, description, image, id }) => `<div id="${id}" class="card org-card" ${data({ orgName: name })}  ${attr({ hidden: hide(name, search )})}>
				<b class="block partner-name">${name}</b>
				<img ${attr({ src: image.src, height: image.height, width: image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
				<p>${description}</p>
				<a href="/partners/${id}" class="btn btn-primary btn-lg">
					<svg height="18" width="18" fill="currentColor" aria-hidden="true">
						<use xlink:href="/img/icons.svg#organization"></use>
					</svg>
					<span>Learn More</span>
				</a>
			</div>`).join('\n')}
		</div>`;
	}
}

export const title = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ title }) => `${title} | ${site.title}`);

export const description = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ description }) => description);
