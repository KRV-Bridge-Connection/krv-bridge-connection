import { site, SCHEMA } from '../consts.js';
import { getAllItems, getItem, getStoreReadWrite, handleIDBRequest, openDB } from '@aegisjsproject/idb';
import { escape } from '@aegisjsproject/core/dom.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { md } from '@aegisjsproject/markdown';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { getSearch } from '@aegisjsproject/url/search.js';
import { createSVGFallbackLogo } from '../functions.js';

const style = css`.partner-image {
	max-width: 100%;
	height: auto;
	background-color: #fafafa;
	background-color: light-dark(transparent, #fafafa);
	padding: 0.3em;
	border-radius: 4px;
}

.card.org-card, .card.resource-contact {
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
}

svg.resource-logo {
	aspect-ratio: 8/3;
	height: auto;
}`;

const darkMode = matchMedia('(prefers-color-scheme: dark)');
const getSVGFill = () => darkMode.matches ? '#242424' : '#fafafa';
const getSVGTextColor = () => darkMode.matches ? '#fefefe' : '#232323';
const cache = new Map();
const STORE_NAME = 'partners';
// const ONE_WEEK = 604800000;
const ONE_DAY = 86400000;
const DB_TTL = ONE_DAY;
const storageKey = '_lastSync:partners';
const category = getSearch('category', '');
export const ORG_CATEGORIES = [
	'Housing & Rental Assistance',
	'Mental Health',
	'Substance Abuse',
	'Suicide Prevention',
	'Domestic Violence',
	'Sexual Assault',
	'Human Trafficking',
	'Child Abuse',
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
	'Homelessness',
	'Elected Officials',
].sort();

const linkIcon = `<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Website">
	<use xlink:href="/img/icons.svg#link-external"></use>
</svg>`;

const phoneIcon = `<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Call">
	<use xlink:href="/img/icons.svg#call-start"></use>
</svg>`;

const emailIcon = `<svg class="icon" width="18" height="18" fill="currentColor" aria-label="Email">
	<use xlink:href="/img/icons.svg#mail"></use>
</svg>`;

const getPhoneLink = ({ telephone }) => typeof telephone !== 'string' ? '' : `<a ${attr({ href: 'tel:' + telephone, content: telephone })} itemprop="telephone" class="btn btn-link btn-lg">
	${phoneIcon}
	<span>${telephone.includes(',') ? `${telephone.replace('+1-', '').split(',')[0]} ext ${telephone.split(',')[1]}` : telephone.replace('+1-', '')}</span>
</a>`;

const getEmailLink = ({ email }) => typeof email !== 'string' ? '' : `<a ${attr({ href: 'mailto:' + email, content: email })} itemprop="email" class="btn btn-link btn-lg">
	${emailIcon}
	<span>${email}</span>
</a>`;

const getWebsite = ({ url }) => typeof url === 'string' && URL.canParse(url) ? `<a ${attr({ href: url })} target="_blank" itemprop="url" rel="noopener noreferrer external" class="btn btn-link btn-lg">
	${linkIcon}
	<span>${new URL(url).hostname}</span>
</a>` : '';

const getTime = time => new Date('2000-01-01T' + time).toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit'});

const getHours = ({ hoursAvailable }) => Array.isArray(hoursAvailable) && hoursAvailable.length !== 0
	? '<ul class="hours-list block">' +  hoursAvailable.map(({ dayOfWeek, opens, closes }) => `<li class="hours block" itemprop="hoursAvailable" itemtype="https://schema.org/OpeningHoursSpecification" itemscope="">
		<b itemprop="dayOfWeek" content="${dayOfWeek}">${dayOfWeek}</b>
		<time datetime="${opens}" itemprop="opens">${getTime(opens)}</time>
		<span class="spacer">&mdash;</span>
		<time datetime="${closes}" itemprop="closes">${getTime(closes)}</time>
	</li>`).join('') : '';

const getCategoryLink = (category) => {
	const link = new URL('/resources/', location.origin);
	link.searchParams.set('category', category);
	return link.href;
};

const categoryLink = category => `<a href="${getCategoryLink(category)}" class="btn btn-link">
	<svg class="icon" width="16" height="16" fill="currentColor" aria-hidden="true">
		<use xlink:href="/img/icons.svg#tag"></use>
	</svg>
	<span>${category}</span>
</a>`;

const listCategories = () => ORG_CATEGORIES.map(category => categoryLink(category)).join(' ');

const searchForm = () => `<search>
	<form id="org-search" action="/resources/" method="GET">
		<div class="form-group">
			<label for="search-orgs" class="visually-hidden">Search by Category</label>
			<input type="search" name="category" id="search-orgs" class="input" placeholder="Search by category" autocomplete="off" ${attr({ value: category.toString() })} list="org-categories" required="" />
			<datalist id="org-categories">
				${ORG_CATEGORIES.map((category) => `<option ${attr({ label: category, value: category })}></option>`).join('\n')}
			</datalist>
			<br />
			<button type="submit" class="btn btn-success">
				<svg class="icon" height="18" width="18" fill="currentColor" aria-hidden="true">
					<use xlink:href="/img/icons.svg#search"></use>
				</svg>
				<span>Search</span>
			</button>
			<button type="reset" class="btn btn-danger">
				<svg class="icon" height="18" width="18" fill="currentColor" aria-hidden="true">
					<use xlink:href="/img/icons.svg#x"></use>
				</svg>
				<span>Reset</span>
			</button>
		</div>
	</form>
</search>`;

const search211 = () => `<form action="https://www.211ca.org/search" method="GET" target="_blank" rel="noopener noreferrer external">
	<fieldset class="no-border">
		<legend>Search 2-1-1</legend>
		<p>211 is a free information and referral service that connects people to health and human services in their community 24 hours a day, 7 days a week.</p>
		<div class="form-group">
			<label for="211-search" class="input-label required">How can we help?</label>
			<input type="search" name="search" id="211-search" class="input" placeholder="What are you searching for?" list="211-suggestions" ${attr({ value: category })} autocomplete="off" required="" />
			<input type="hidden" name="location" value="93240" />
		</div>
	</fieldset>
	<button type="submit" class="btn btn-success">
		<svg height="16" width="16" fill="currentColor" class="icon" role="presentation" aria-hidden="true">
			<use xlink:href="/img/icons.svg#search"></use>
		</svg>
		<span>Search 211</span>
	</button>
	<a href="tel:211" class="btn btn-primary">
		${phoneIcon}
		<span>Call 211</span>
	</button>
	<a href="https://www.211ca.org/about-2-1-1" class="btn btn-link" target="_blank" rel="noopener noreferrer external" target="_blank">
		<svg height="16" width="16" fill="currentColor" class="icon" role="presentation" aria-hidden="true">
			<use xlink:href="/img/icons.svg#link-external"></use>
		</svg>
		<span>More information</span>
	</a>
</form>`;

document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];

const createPartner = result => {
	const page = html`<div class="org-info" itemtype="https://schema.org/${result['@type'] ?? 'Organization'}" ${data({ orgName: result.name })} itemscope="">
		<h2>
			<span itemprop="name">${result.name}</span>
		</h2>
		${typeof result?.image?.src === 'string'
		? `<img ${attr({ src: result.image.src, height: result.image.height, width: result.image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />`
		: createSVGFallbackLogo(result.name, { width: 640, height: 240, fontSize: 52, fontWeight: 800, fill: getSVGFill(), textColor: getSVGTextColor(), classList: ['full-width', 'resource-logo'] }).outerHTML}
		<div class="flex row wrap">${result.categories.map(category => categoryLink(category)).join(' ')}</div>
		<p itemprop="description">${result.description}</p>
		<section class="card resource-contact main-contact">
			<h3>Main Contact</h3>
			${getEmailLink(result)}
			${getPhoneLink(result)}
			${getWebsite(result)}
		</section>

		${Array.isArray(result.contactPoint) && result.contactPoint.length !== 0 ? result.contactPoint.map(contact => `<div class="card resource-contact contact-point" itemprop="contactPoint" itemtype="https://schema.org/ContactPoint" itemscope="">
			<h3>${typeof contact.name === 'string'
		? `<span itemprop="name">${contact.name}</span> &mdash; <span itemprop="contactType">${contact.contactType}</span>`
		: `<span itemprop="contactType">${contact.contactType}</span>`}</h3>
			${typeof contact.description === 'string' ? `<p itemprop="description">${escape(contact.description)}</p>` : ''}
			${getPhoneLink(contact)}
			${getEmailLink(contact)}
			${getHours(contact)}
			${typeof contact.description === 'string' ? `<p itemprop="description">${contact.description}</p>` : ''}
		</div>`).join('\n') : ''}`;

	if (typeof result.content === 'string' && result.content.length !== 0) {
		const article = document.createElement('article');
		article.append(md`${result.content}`);
		page.append(article);
	}

	return page;
};

const createPartners = results => results.map(({ name, description, image, partner = false, id }) => `<div id="${id}" class="card org-card" ${data({ orgName: name })}>
	<b class="block partner-name">${name}</b>
	${typeof image?.src === 'string'
		? `<img ${attr({ src: image.src, height: image.height, width: image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />`
		: createSVGFallbackLogo(name, { width: 640, height: 240, fontSize: 52, fontWeight: 800, fill: getSVGFill(), textColor: getSVGTextColor(), classList: ['full-width', 'resource-logo'] }).outerHTML}
	<p>${description}</p>
	<a href="/${partner ? 'partners' : 'resources'}/${id}" class="btn btn-primary btn-lg">
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

export async function getMetadata({ matches, signal } = {}) {
	if (typeof matches.search.groups.category === 'string' && matches.search.groups.category.length !== 0) {
		const category = new URLSearchParams(matches.search.input).get('category');

		return {
			title: `Search results for ${category}`,
			description: `Search results for ${category}`,
		};
	} else if (typeof matches.pathname.groups.partner === 'string' && matches.pathname.groups.partner.length !== 0) {
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

await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA }).then(async db => {
	try {
		await syncDB(db);
	} catch(err) {
		reportError(err);
	} finally {
		db.close();
	}
});

export default async function ({ matches, signal, url, params: { partner, category } = {} } = {}) {
	const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });

	try {
		if (typeof partner === 'string' && partner.length !== 0) {
			db.close();
			const result = await getPartnerInfo(matches, { signal }).catch(err => err);

			if (result instanceof Error) {
				return html`<div class="status-box error">${result.message}</div>`;
			} else if (typeof result === 'object') {
				return createPartner(result);
			} else {
				return html`<h2>Not Found</h2>`;
			}
		} else if (typeof category === 'string' && category.length !== 0) {
			const { searchParams } = new URL(url);

			try {
				const results = await getAllItems(db, STORE_NAME, searchParams.get('category').toLowerCase(), { indexName: 'categories', signal });
				db.close();

				if (Array.isArray(results) && results.length !== 0) {
					const frag = html`
						${searchForm()}
						<h2>Search Results for <q>${escape(searchParams.get('category'))}</q></h2>
						${createPartners(results)}
						${listCategories()}
					`;

					frag.querySelector('form').action = '/resources/';
					return frag;
				} else {
					const frag = html`
						<h2 class="status-box error">No Results found for <q>${escape(searchParams.get('category'))}</q></h2>
						${search211()}
						<hr />
						${listCategories()}
					`;

					frag.querySelector('form').action = 'https://www.211ca.org/search';

					return frag;
				}
			} catch (err) {
				reportError(err);
				db.close();

				const frag = html`
					${searchForm()}
					<div class="status-box error">${err.message}</div>
					${listCategories()}
				`;

				frag.querySelector('form').action = '/resources/';
				return frag;
			}
		} else {
			const results = await getAllItems(db, STORE_NAME, null, { signal });
			db.close();

			const frag = html`
				${searchForm()}
				<div>
					${createPartners(results.filter(result => result.partner))}
				</div>
				<section>
					<h3>Filter by Category</h3>
					<div class="flex row wrap">${listCategories()}</div>
				</section>
			`;

			frag.querySelector('form').action = '/resources/';
			return frag;
		}
	} catch(err) {
		reportError(err);
		db.close();

		return html`
			${searchForm()}
			<div class="status-box error">${err.message}</div>
			${listCategories()}
		`;
	}
}

export const title = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ title }) => `${title} | ${site.title}`);

export const description = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ description }) => description);
