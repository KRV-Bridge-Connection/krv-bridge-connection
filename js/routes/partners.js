import { site, SCHEMA } from '../consts.js';
import { getAllItems, getItem, putAllItems, openDB } from '@aegisjsproject/idb';
import { escape } from '@aegisjsproject/core/dom.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { md } from '@aegisjsproject/markdown';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { getSearch } from '@aegisjsproject/url/search.js';
import { createSVGFallbackLogo } from '../functions.js';

const SOURCE = 'krv-bridge';
const MEDIUM = 'referrer';
const CONTENT = 'resource-directory';
const CAMPAIGN = 'resource-directory';

export const ORG_CATEGORIES = [
	'Housing & Rental Assistance',
	'Mental Health',
	'Behavioral Health',
	'Substance Abuse',
	'Suicide Prevention',
	'Domestic Violence',
	'Sexual Assault',
	'Human Trafficking',
	'Child Abuse',
	'Post-Incarceration Support',
	'Animal Services',
	'Veterans Services',
	'Senior Services',
	'Disabled Services',
	'Legal Assistance',
	'Family & Pregnancy Resources',
	'Transportation',
	'Food',
	'Clothing',
	'Financial Services',
	'Emergency Services',
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
	'Public Safety',
	'Home Improvement & Safety',
].sort();

const REDIRECTS = new Map([
	['taxes', 'Financial Services'],
	['addiction', 'Substance Abuse'],
	['drug addiction', 'Substance Abuse'],
	['minor abuse', 'Child Abuse'],
	['disability', 'Disabled Services'],
	['senior', 'Senior Services'],
	['elderly', 'Senior Services'],
	['medical', 'Healthcare'],
	['pregnancy', 'Family & Pregnancy Resources'],
	['job', 'Employment'],
	['jobs', 'Employment'],
	['work', 'Employment'],
	['housing', 'Housing & Rental Assistance'],
	['rent', 'Housing & Rental Assistance'],
	['rental', 'Housing & Rental Assistance'],
	['suicide', 'Suicide Prevention'],
	['bus', 'Transportation'],
	['pets', 'Animal Services'],
	['animal', 'Animal Services'],
	['bills', 'Utility Assistance'],
	['utilities', 'Utility Assistance'],
	['sce', 'Utility Assistance'],
	['electric', 'Utility Assistance'],
	['water', 'Utility Assistance'],
	['propane', 'Utility Assistance'],
	['finance', 'Financial Services'],
	['veterans', 'Veterans Services'],
	['veteran', 'Veterans Services'],
	['vet', 'Veterans Services'],
	['felony', 'Post-Incarceration Support'],
	['dv', 'Domestic Violence'],
	['sa', 'Sexual Assault'],
	['rape', 'Sexual Assault'],
	['doctor', 'Healthcare'],
	['therapy', 'Mental Health'],
	['counseling', 'Mental Health'],
	['rehab', 'Substance Abuse'],
	['detox', 'Substance Abuse'],
	['food stamps', 'Food'],
	['ebt', 'Food'],
	['snap', 'Food'],
	['pantry', 'Food'],
	['eviction', 'Housing & Rental Assistance'],
	['lawyer', 'Legal Assistance'],
	['court', 'Legal Assistance'],
	['parole', 'Post-Incarceration Support'],
	['probation', 'Post-Incarceration Support'],
	['abuse', 'Domestic Violence'],
	['startup', 'Entrepreneurship'],
	['payee', 'Financial Services'],
	['services', 'Financial Services'],
	['911', 'Emergency Services'],
	['emergency', 'Emergency Services'],
	['sheriff', 'Emergency Services'],
	['animal shelter', 'Animal Services'],
	['restraining order', 'Legal Assistance'],
	['shelter', 'Homelessness'],
	['homeless', 'Homelessness'],
	['section 8', 'Housing & Rental Assistance'],
	['clothes', 'Clothing'],
	['shoes', 'Clothing'],
	['soup kitchen', 'Food'],
	['liheap', 'Utility Assistance'],
	['heap', 'Utility Assistance'],
	['medi-cal', 'Insurance'],
	['medicare', 'Insurance'],
	['unemployment', 'Employment'],
	['ged', 'Education'],
	['cps', 'Child Abuse'],
	['wic', 'Family & Pregnancy Resources'],
	['trafficking', 'Human Trafficking'],
	['fema', 'Disaster Relief & Recovery'],
	['psychiatrist', 'Mental Health'],
	['warrant', 'Legal Assistance'],
	['custody', 'Legal Assistance'],
	['divorce', 'Legal Assistance'],
	['child support', 'Legal Assistance'],
	['roof', 'Home Improvement & Safety'],
	['roofing', 'Home Improvement & Safety'],
	['home repair', 'Home Improvement & Safety'],
	['usda', 'Home Improvement & Safety'],
	['rural development', 'Home Improvement & Safety'],
	['weatherization', 'Home Improvement & Safety'],
	['insulation', 'Home Improvement & Safety'],
	['fire safe', 'Home Improvement & Safety'],
	['brush clearing', 'Home Improvement & Safety'],
	['defensible space', 'Home Improvement & Safety'],
	['chipping', 'Home Improvement & Safety'],
	['weed abatement', 'Home Improvement & Safety'],
	['hvac', 'Home Improvement & Safety'],
	['mold', 'Home Improvement & Safety'],
]);

function _addUTM(url) {
	if (typeof url === 'string') {
		return _addUTM(URL.parse(url));
	} else if (url instanceof URL) {
		url.searchParams.set('utm_source', SOURCE);
		url.searchParams.set('utm_medium', MEDIUM);
		url.searchParams.set('utm_content', CONTENT);
		url.searchParams.set('utm_campaign', CAMPAIGN);
		return url.href;
	} else {
		return null;
	}
}

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

// const ALIASES = {
// 	'medical': 'healthcare',
// };

const sortPartners = (a, b) => a.partner === b.partner ? 0 : a.partner ? -1 : 1;

const linkIcon = `<svg class="icon" width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-label="Website">
	<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
</svg>`;

const phoneIcon = `<svg class="icon" width="16" height="16" version="1" viewBox="0 0 16 16" fill="currentColor" aria-label="Call">
	 <path d="M13.032 1c.534 0 .969.427.969.969v.062c-.017 6.613-5.383 11.97-12 11.97H1.97c-.545 0-.97-.447-.97-1v-3c0-.555.447-1 1-1h2c.555 0 1 .445 1 1v.468A8.967 8.967 0 0 0 10.47 5H10c-.553 0-1-.446-1-1V2c0-.554.447-1 1-1h3.032z"/>
</svg>`;

const emailIcon = `<svg class="icon" width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-label="Email">
	<path fill-rule="evenodd" d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/>
</svg>`;

const getPhoneLink = ({ telephone }) => typeof telephone !== 'string' ? '' : `<a ${attr({ href: 'tel:' + telephone, content: telephone })} itemprop="telephone" class="btn btn-link btn-lg">
	${phoneIcon}
	<span>${telephone.includes(',') ? `${telephone.replace('+1-', '').split(',')[0]} ext ${telephone.split(',')[1]}` : telephone.replace('+1-', '')}</span>
</a>`;

const getEmailLink = ({ email }) => typeof email !== 'string' ? '' : `<a ${attr({ href: 'mailto:' + email, content: email })} itemprop="email" class="btn btn-link btn-lg">
	${emailIcon}
	<span>${email}</span>
</a>`;

const getWebsite = ({ url }) => typeof url === 'string' && URL.canParse(url) ? `<a ${attr({ href: _addUTM(url) })} target="_blank" itemprop="url" rel="noopener noreferrer external" class="btn btn-link btn-lg">
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

function getAddress({
	address: {
		streetAddress,
		postOfficeBoxNumber,
		addressLocality,
		addressRegion = 'CA',
		postalCode,
		addressCountry = 'US',
	} = {}
} = {}) {
	return (typeof streetAddress === 'string' || typeof postOfficeBoxNumber === 'string') ? `<div itemprop="address" itemtype="https://schema.org/PostalAddress" itemscope="">
		${typeof streetAddress === 'string' ? `<div itemprop="streetAddress">${streetAddress}</div>` : ''}
		${typeof postOfficeBoxNumber === 'string' ? `<div itemprop="postOfficeBoxNumber">P.O. Box ${postOfficeBoxNumber}</div>` : ''}
		<div>
			<span itemprop="addressLocality">${addressLocality}</span>,
			<span itemprop="addressRegion">${addressRegion ?? 'CA'}</span>
			<span itemprop="postalCode">${postalCode}</span>
		</div>
		<div itemprop="addressCountry" hidden="">${addressCountry ?? 'US'}</div>
	</div>` : '';
}

const getCategoryLink = (category) => {
	const link = new URL('/resources/', location.origin);
	link.searchParams.set('category', category);
	return link.href;
};

const categoryLink = category => `<a href="${getCategoryLink(category)}" class="btn btn-link">
	<svg class="icon" width="14" height="16" viewBox="0 0 14 16" fill="currentColor" aria-hidden="true">
		<path fill-rule="evenodd" d="M7.685 1.72a2.49 2.49 0 0 0-1.76-.726H3.48A2.5 2.5 0 0 0 .994 3.48v2.456c0 .656.269 1.292.726 1.76l6.024 6.024a.99.99 0 0 0 1.402 0l4.563-4.563a.99.99 0 0 0 0-1.402L7.685 1.72zM2.366 7.048A1.54 1.54 0 0 1 1.9 5.925V3.48c0-.874.716-1.58 1.58-1.58h2.456c.418 0 .825.159 1.123.467l6.104 6.094-4.702 4.702-6.094-6.114zm.626-4.066h1.989v1.989H2.982V2.982h.01z"/>
	</svg>
	<span itemprop="keywords">${category}</span>
</a>`;

const listCategories = () => ORG_CATEGORIES.map(category => categoryLink(category)).join(' ');

const searchForm = ({ autoFocus = false } = {}) => `<search>
	<form id="org-search" action="/resources/" method="GET" itemprop="potentialAction" itemtype="https://schema.org/SearchAction" itemscope="">
		<meta itemprop="target" ${attr({ content: `${new URL(location.pathname, location.origin)}?category={category}` })}/>
		<div class="form-group">
			<label for="search-orgs" class="visually-hidden">Search by Category</label>
			<input type="search" name="category" id="search-orgs" class="input" placeholder="Search by category" itemprop="query query-input" autocomplete="off" ${attr({ value: category.toString(), autofocus: autoFocus })} list="org-categories" required="" />
			<datalist id="org-categories">
				${ORG_CATEGORIES.map((category) => `<option ${attr({ label: category, value: category })}></option>`).join('\n')}
			</datalist>
			<br />
			<button type="submit" class="btn btn-success">
				<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
				</svg>
				<span>Search</span>
			</button>
			<button type="reset" class="btn btn-danger">
				<svg class="icon"  width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
				</svg>
				<span>Reset</span>
			</button>
		</div>
	</form>
</search>`;

const search211 = () => `<search>
	<form id="search-211" action="https://www.211ca.org/search" method="GET" target="_blank" rel="noopener noreferrer external">
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
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="icon" role="presentation" aria-hidden="true">
				<path fill-rule="evenodd" d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
			</svg>
			<span>Search 211</span>
		</button>
		<a href="tel:211" class="btn btn-primary">
			${phoneIcon}
			<span>Call 211</span>
		</button>
		<a href="https://www.211ca.org/about-2-1-1" class="btn btn-link" target="_blank" rel="noopener noreferrer external" target="_blank">
			${phoneIcon}
			<span>More information</span>
		</a>
	</form>
</search>`;

document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];

export const createPartner = result => {
	const page = html`<div class="org-info" itemtype="https://schema.org/${result['@type'] ?? 'Organization'}" ${data({ orgName: result.name })} itemscope="">
		<h2>
			<span itemprop="name">${result.name}</span>
		</h2>
		${typeof result?.image?.src === 'string'
		? `<img ${attr({ src: result.image.src, height: result.image.height, width: result.image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />`
		: createSVGFallbackLogo(result.name, { width: 640, height: 240, fontSize: 52, fontWeight: 800, fill: getSVGFill(), textColor: getSVGTextColor(), classList: ['full-width', 'resource-logo'] }).outerHTML}
		<div class="flex row wrap">${(result.keywords ?? result.categories).map(category => categoryLink(category)).join(' ')}</div>
		<p itemprop="description">${result.description}</p>
		${['email', 'telephone', 'url', 'address'].some(prop => result.hasOwnProperty(prop)) ? `<section class="card resource-contact main-contact">
			<h3>Main Contact</h3>
			${getEmailLink(result)}
			${getPhoneLink(result)}
			${getWebsite(result)}
			${getAddress(result)}
		</section>` : ''}

		${Array.isArray(result.contactPoint) && result.contactPoint.length !== 0 ? result.contactPoint.map(contact => `<div class="card resource-contact contact-point" itemprop="contactPoint" itemtype="https://schema.org/ContactPoint" itemscope="">
			<h3>${typeof contact.name === 'string'
			? `<span itemprop="name">${contact.name}</span> &mdash; <span itemprop="contactType">${contact.contactType}</span>`
			: `<span itemprop="contactType">${contact.contactType}</span>`}</h3>
			${typeof contact.description === 'string' ? `<p itemprop="description">${escape(contact.description)}</p>` : ''}
			${getPhoneLink(contact)}
			${getEmailLink(contact)}
			${getWebsite(contact)}
			${getAddress(contact)}
			${getHours(contact)}
		</div>`).join('\n') : ''}`;

	if (typeof result.content === 'string' && result.content.length !== 0) {
		const article = document.createElement('article');
		article.append(md`${result.content}`);
		page.append(article);
	}

	return page;
};

export const createPartners = results => results.sort(sortPartners).map(({ name, description, image, partner = false, id }) => `<div id="${id}" class="card org-card" ${data({ orgName: name })}>
	<b class="block partner-name">${name}</b>
	${typeof image?.src === 'string'
		? `<img ${attr({ src: image.src, height: image.height, width: image.width, alt: name })} class="block full-width partner-image" loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />`
		: createSVGFallbackLogo(name, { width: 640, height: 240, fontSize: 52, fontWeight: 800, fill: getSVGFill(), textColor: getSVGTextColor(), classList: ['full-width', 'resource-logo'] }).outerHTML}
	<p>${description}</p>
	<a href="/${partner ? 'partners' : 'resources'}/${id}" class="btn btn-primary btn-lg">
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="icon" fill="currentColor" aria-hidden="true">
			<path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"/>
		</svg>
		<span>Learn More</span>
	</a>
</div>`).join('\n');

const needsSync = (ttl = DB_TTL) => localStorage.hasOwnProperty(storageKey)
	? navigator.onLine ? Date.now() - (parseInt(localStorage.getItem(storageKey)) || 0) > ttl : false
	: true;

export async function syncDB(db, { signal } = {}) {
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

				if (partners.length !== 0) {
					await putAllItems(db, STORE_NAME, partners, { signal, durability: 'strict' });
				}

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
	const stack = new DisposableStack();
	const { promise, resolve, reject } = Promise.withResolvers();

	if (typeof partner !== 'string') {
		reject(new Error('No partner specified'));
	} else if (cache.has(partner)) {
		resolve(cache.get(partner));
	} else {
		cache.set(partner, promise);
		const db = stack.adopt(await openDB(SCHEMA.name, { version: SCHEMA.version }), db => db.close());

		getItem(db, STORE_NAME, partner, { signal })
			.then(result => typeof result === 'undefined'
				? reject(new DOMException(`No results found for ${partner.replaceAll('-', ' ')}`, 'NotFoundError'))
				: resolve(result)
			)
			.catch(cause => reject(new Error(`Error getting ${partner}`, { cause })))
			.finally(stack.dispose.bind(stack));
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

export default async function ({ matches, signal, stack, url, params: { partner, category } = {} } = {}) {
	const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA, stack });

	try {
		if (typeof partner === 'string' && partner.length !== 0) {
			const result = await getPartnerInfo(matches, { signal }).catch(err => err);

			if (result instanceof Error) {
				return html`<div class="status-box error">${result.message}</div>`;
			} else if (result instanceof URL) {
				return result;
			} else if (typeof result === 'object') {
				return createPartner(result);
			} else {
				return html`<h2>Not Found</h2>`;
			}
		} else if (typeof category === 'string' && category.length !== 0) {
			const { searchParams } = new URL(url);
			const normalized = searchParams.get('category').toLowerCase().trim().replaceAll(/[^a-z0-9&\- ]/g, '').replaceAll(/\s{2,}/g, ' ');

			try {
				const results = await getAllItems(db, STORE_NAME, normalized, { indexName: 'keywords', signal });

				if (Array.isArray(results) && results.length !== 0) {
					const frag = html`
						${searchForm({ autoFocus: false })}
						<h2>Search Results for <q>${escape(searchParams.get('category'))}</q></h2>
						${createPartners(results)}
						<hr />
						<section>
							<h2>Not finding what you're looking for? Search 2-1-1.</h2>
							${search211({ autoFocus: false })}
						</section>
						<div class="flex row wrap">${listCategories()}</div>
					`;

					frag.getElementById('org-search').action = '/resources/';
					frag.getElementById('search-211').action = 'https://www.211ca.org/search';

					return frag;
				} else if (REDIRECTS.has(normalized)) {
					const url = new URL(location.pathname, location.origin);
					url.searchParams.set('category', REDIRECTS.get(normalized));
					return url;
				} else {
					const frag = html`
						<h2 class="status-box error">No Results found for <q>${escape(searchParams.get('category'))}</q></h2>
						${search211()}
						<hr />
						<div class="flex row wrap">${listCategories()}</div>
					`;

					frag.querySelector('form').action = 'https://www.211ca.org/search';

					return frag;
				}
			} catch (err) {
				reportError(err);

				const frag = html`
					${searchForm({ autoFocus: true })}
					<div class="status-box error">${err.message}</div>
					<div class="flex row wrap">${listCategories()}</div>
				`;

				frag.querySelector('form').action = '/resources/';
				return frag;
			}
		} else {
			const results = await getAllItems(db, STORE_NAME, null, { signal });

			const frag = html`
				${searchForm({ autoFocus: false })}
				<p>These are the nonprofit organizations providing services at or through the KRV Bridge Connection.</p>
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

		return html`
			${searchForm({ autoFocus: true })}
			<div class="status-box error">${err.message}</div>
			${listCategories()}
		`;
	}
}

export const title = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ title }) => `${title} | ${site.title}`);

export const description = async ({ matches, signal }) => await getMetadata({ matches, signal })
	.then(({ description }) => description);
