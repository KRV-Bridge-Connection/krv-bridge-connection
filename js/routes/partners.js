import { site, SCHEMA } from '../consts.js';
import { getAllItems, getItem, getStoreReadWrite, handleIDBRequest, openDB } from '@aegisjsproject/idb';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { md } from '@aegisjsproject/markdown';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { manageSearch } from '@aegisjsproject/url/search.js';
import { navigate } from '@aegisjsproject/router/router.js';


const categories = [
	'Housing & Rental Assistance',
	'Mental Health',
	'Substance Abuse',
	'Suicide Prevention',
	'Domestic Violence',
	'Sexual Assault',
	'Human Trafficing',
	'Post-Incarceration Support',
	'Veteran\'s Services',
	'Senior Services',
	'Disabled Services',
	'Legal Assistance',
	'Family & Pregnancy Resources',
	'Transportation',
	'Food',
	'Clothing',
	'Financial Services',
	'Law Enforcement',
	'Healthcare',
	'Utility Assistance',
	'Disaster Relief & Recovery',
	'Employment',
	'Education',
	'Business',
	'Entrepreneurship',
	'Insurance',
	'Borel Fire',
	'Homelessness'
];

const listCategories = () => categories.map(category => {
	const a = document.createElement('a');
	const link = new URL(location.pathname, location.origin);
	link.searchParams.set('category', category);
	a.href = link;
	a.textContent = category;
	a.classList.add('btn', 'btn-link');
	return a.outerHTML;
}).join(' ');

const storageKey = '_lastSync:partners';

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

const createPartner = result => {
	const page = html`<div class="org-info" itemtype="https://schema.org/${result['@type'] ?? 'Organization'}" ${data({ orgName: result.name })} itemscope="">
			<h2>
				<span itemprop="name">${result.name}</span>
			</h2>
			<img ${attr({ src: result.image.src, height: result.image.height, width: result.image.width, alt: result.image.alt ?? result.name })} class="block full-width partner-image" itemprop="image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
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

		if (typeof result.content === 'string' && result.content.length !== 0) {
			const article = document.createElement('article');
			article.append(md`${result.content}`);
			page.append(article);
		}

		return page;
};

const createPartners = results => results.map(({ name, description, image, id }) => `<div id="${id}" class="card org-card" ${data({ orgName: name })}  ${attr({ hidden: hide(name, search )})}>
	<b class="block partner-name">${name}</b>
	<img ${attr({ src: image.src, height: image.height, width: image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
	<p>${description}</p>
	<a href="/partners/${id}" class="btn btn-primary btn-lg">
		<svg height="18" width="18" fill="currentColor" aria-hidden="true">
			<use xlink:href="/img/icons.svg#organization"></use>
		</svg>
		<span>Learn More</span>
	</a>
</div>`).join('\n');

const needsSync = (ttl = DB_TTL) => localStorage.hasOwnProperty(storageKey)
	? Date.now() - (parseInt(localStorage.getItem(storageKey)) || 0) > ttl
	: true;

async function syncDB(db, { signal } = {}) {
	if (needsSync(DB_TTL)) {
		try {
			const url = new URL('/api/partners', location.origin);

			if (localStorage.hasOwnProperty(storageKey)) {
				url.searchParams.set('lastUpdated', new Date(parseInt(localStorage.getItem(storageKey)) || 0).toISOString());
			}

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

				localStorage.setItem(storageKey, Date.now());
			} else {
				throw new DOMException(`${resp.url} [${resp.status}]`, 'NotFound');
			}
		} catch(err) {
			reportError(err);
		}
	}
}

const searchPartners = registerCallback('partner:search:submit', event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const url = new URL(location.pathname, location.origin);
	url.searchParams.set('category', data.get('category'));

	navigate(url, history.state);
});

const resetPartnerSearch = registerCallback('partner:reset', () => {
	navigate(new URL(location.pathname, location.origin));
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

export default async function ({ matches, signal, url } = {}) {
	const { searchParams } = new URL(url);

	if (typeof matches?.pathname?.groups?.partner === 'string' && matches.pathname.groups.partner.length !== 0) {
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });
		await syncDB(db, { signal });
		db.close();
		const result = await getPartnerInfo(matches, { signal }).catch(err => err);

		if (result instanceof Error) {
			return html`<div class="status-box error">${result.message}</div>`;
		} else if (typeof result === 'object') {
			return createPartner(result);
		} else {
			return html`<h2>Not Found</h2>`;
		}
	} else if (searchParams.has('category')) {
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });

		try {
			const results = await getAllItems(db, STORE_NAME, searchParams.get('category'), { indexName: 'categories', signal });
			db.close();

			if (Array.isArray(results) && results.length !== 0) {
				return createPartners(results) + listCategories();
			} else {
				throw new Error(`No results for ${searchParams.get('category')}`);
			}
		} catch (err) {
			reportError(err);
			db.close();
			return html`<div class="status-box error">${err.message}</div>${listCategories()}`;
		}
	} else {
		const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });
		await syncDB(db, { signal });
		const results = await getAllItems(db, STORE_NAME, null, { signal });
		const sig = registerSignal(signal);

		return html`<search>
			<form id="org-search" ${onSubmit}="${searchPartners}" ${onReset}="${resetPartnerSearch}" ${signalAttr}="${sig}">
				<div class="form-group">
					<label for="search-orgs" class="visually-hidden">Search by Category</label>
					<input type="search" name="category" id="search-orgs" class="input" placeholder="Search by category" autocomplete="off" ${attr({ value: search })} list="org-categories" required="" />
					<datalist id="org-categories">
						${categories.map((category) => `<option ${attr({ label: category, value: category })}></option>`).join('\n')}
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
			${createPartners(results.filter(result => result.partner))}
		</div>
		<section class="flex row wrap">
			<h3>Filter by Category</h3>
			${listCategories()}
		</section>`;
	}
}

export const title = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ title }) => `${title} | ${site.title}`);

export const description = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ description }) => description);
