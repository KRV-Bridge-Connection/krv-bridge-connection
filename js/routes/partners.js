/* eslint-disable */
import { site, DB_VERSION } from '../consts.js';
import { getAllItems, getItem, openDB } from '@aegisjsproject/idb';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onSubmit, onReset, signal as signalAttr, registerSignal } from '@aegisjsproject/callback-registry/events.js';

const cache = new Map();
const DB_NAME = 'krv-bridge';
const STORE_NAME = 'partners';

const searchPartners = registerCallback('partner:search', event => {
	event.preventDefault();
	const data = new FormData(event.target);
	const search = data.get('search').toLowerCase();

	if (search.length === 0) {
		document.querySelectorAll('[data-org-name]').forEach(el => el.hidden = false);
	} else {
		document.querySelectorAll('[data-org-name]').forEach(el => {
			el.hidden = ! el.dataset.orgName.toLowerCase().includes(search);
		});
	}
});

const resetPartnerSearch = registerCallback('partner:reset', () => {
	document.querySelectorAll('[data-org-name]').forEach(el => el.hidden = false);
});

function onUpgrade({ target }) {
	/**
	 * @type {IDBDatabase}
	 */
	const db = target.result;

	if (! db.objectStoreNames.contains(STORE_NAME)) {
		const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
		store.createIndex('name', 'name', { unique: false });
		store.createIndex('categories', 'categories', { multiEntry: true });

		// Seed initial data
		for (const partner of initialData) {
			store.put(partner);
		}
  	}
}

const lastUpdated = new Date();

const categories = {
	'food': crypto.randomUUID(),
	'housing': crypto.randomUUID(),
	'rent': crypto.randomUUID(),
	'utilities': crypto.randomUUID(),
	'addiction': crypto.randomUUID(),
	'homelessness': crypto.randomUUID(),
	'financial': crypto.randomUUID(),
	'abuse': crypto.randomUUID(),
	'employment': crypto.randomUUID(),
};

const initialData = [{
	id: 'krv-bridge-connection',
	name: 'KRV Bridge Connection',
	url: 'https://krvbridge.org/',
	email: 'contact@krvbridge.org',
	telephone: '+1-661-491-5873',
	description: 'The KRV Bridge Connection bridges the gap between the KRV Community and organizations that offer assistance.',
	lastUpdated,
	categories: [],
	image: {
		src: 'https://krvbridge.org/img/branding/krv-bridge-logo-wide.svg',
		width: 640,
		height: 385,
	}
}, {
	id: 'be-finally-free',
	name: 'Be Finally Free',
	url: 'https://befinallyfree.org/',
	description: 'Need this still',
	lastUpdated,
	categories: [categories.addiction, categories.homelessness, categories.abuse],
	image: {
		src: 'https://cdn.kernvalley.us/img/raster/missing-image.png',
		width: 640,
		height: 480,
	}
}, {
	id: 'open-door-network',
	name: 'The Open Door Network',
	url: 'https://opendoorhelps.org/',
	description: 'Helping those who enter our door to reimagine their lives',
	lastUpdated,
	categories: [categories.homelessness, categories.abuse, categories.employment],
	image: {
		src: 'https://opendoorhelps.org/wp-content/uploads/2023/02/cropped-cropped-ODNFWLOGO-4.png',
		width: 1164,
		height: 593,
	}
}, {
	id: 'flood-ministries',
	name: 'Flood Ministries',
	url: 'https://www.floodbako.com/',
	description: 'Flood exists to reach out and engage those in our community struggling in homelessness, linking them to resources and services through the supportive housing process.',
	lastUpdated,
	categories: [categories.homelessness],
	image: {
		src: 'https://cdn.kernvalley.us/img/raster/missing-image.png',
		width: 640,
		height: 480,
	}
}, {
	id: 'capk',
	name: 'capk',
	url: 'https://www.capk.org/',
	email: 'info@capk.org',
	telephone: '+1-661-336-5236',
	description: 'Established in 1965, Community Action Partnership of Kern (CAPK) administers more than a dozen programs aimed at meeting children, families and individuals at their point of need.',
	lastUpdated,
	categories: [categories.utilities, categories.food, categories.housing, categories.rent],
	image: {
		src: 'https://cdn.kernvalley.us/img/raster/missing-image.png',
		width: 640,
		height: 480,
	}
}];

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
		const db = await openDB(DB_NAME, { version: DB_VERSION, onUpgrade });

		getItem(db, STORE_NAME, partner, { signal })
			.then(result => typeof result === 'undefined'
				? reject(new DOMException(`No results found for ${partner}`, 'NotFoundError'))
				: resolve(result)
			)
			.catch(cause => reject(new Error(`Error getting ${partner}`, { cause })))
			.finally(db.close.bind(db));
	}

	return promise;
}

export default async function ({ matches, signal } = {}) {
	if (typeof matches?.pathname?.groups?.partner === 'string' && matches.pathname.groups.partner.length !== 0) {
		const result = await getPartnerInfo(matches, { signal }).catch(err => err);

		if (result instanceof Error) {
			return html`<div class="status-box error">${result.message}</div>`;
		} else if (typeof result === 'object') {
			return html`<div class="org-info" itemtype="https://schema.org/${result['@type'] ?? 'Organization'}" data-org-name="${result.name}" itemscope="">
				<h2>
					<span itemprop="name">${result.name}</span>
				</h2>
				<img src="${result.image.src}" itemprop="image" height="${result.image.height}" width="${result.image.width}" alt="${result.name}" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
				<p itemprop="description">${result.description}</p>
				${typeof result.email !== 'string' ? '' : `<a href="mailto:${result.email}" itemprop="email" class="btn btn-link btn-lg">
					<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Email">
						<use xlink:href="/img/icons.svg#mail"></use>
					</svg>
					<span>${result.email}</span>
				</a>`}
				${typeof result.telephone !== 'string' ? '' : `<a href="tel:${result.telephone}" itemprop="telephone" class="btn btn-link btn-lg">
					<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Call">
						<use xlink:href="/img/icons.svg#call-start"></use>
					</svg>
					<span>${result.telephone.replace('+1-', '')}</span>
				</a>`}
				${typeof result.url !== 'string' && URL.canParse(result.url) ? '' : `<a href="${result.url}" target="_blank" itemprop="url" rel="noopener noreferrer external" class="btn btn-link btn-lg">
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
		const db = await openDB(DB_NAME, { version: DB_VERSION, onUpgrade });
		const results = await getAllItems(db, STORE_NAME, null, { signal });

		return html`<search>
			<form id="org-search" ${onSubmit}="${searchPartners}" ${onReset}="${resetPartnerSearch}" ${signalAttr}="${registerSignal(signal)}">
				<div class="form-group">
					<label for="search-orgs" class="visually-hidden">Search Organizations</label>
					<input type="search" name="search" id="search-orgs" class="input" placeholder="Search form..." autocomplete="off" list="org-names" required="" />
					<datalist id="org-names">
						${results.map(({ name }) => `<option value="${name}" label="${name}"></option>`).join('\n')}
					</datalist>
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
			${results.map(({ name, description, image, id }) => `<div id="${id}" class="card" data-org-name="${name}">
				<b class="block">${name}</b>
				<img src="${image.src}" class="block" height="${image.height}" width="${image.width}" loading="lazy" crossoprigin="anonymous" referrerpolicy="no-referrer" alt="" />
				<p>${description}</p>
				<a href="/partners/${id}" class="btn btn-link">
					<svg height="18" width="18" fill="currentColor" aria-hidden="true">
						<use xlink:href="/img/icons.svg#organization"></use>
					</svg>
					<span>Learn More</span>
				</a>
			</div>`).join('\n')}
		</div>`;
	}
}

export const title = async ({ matches, signal } = {}) => `${await getPartnerInfo(matches, { signal })
	.then(result => result.name)
	.catch(() => 'Not Found')} | ${site.title}`;

export const description = async ({ matches, signal } = {}) => await getPartnerInfo(matches, { signal })
	.then(result => result.description)
	.catch(err => err.message);
