import { getAllItems, openDB } from '@aegisjsproject/idb';
import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { useScopedStyle } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { ROOT_COMMANDS } from '@aegisjsproject/commands/consts.js';
import { createGoogleCalendar } from '@shgysk8zer0/kazoo/google/calendar.js';
import { SCHEMA } from '../consts.js';
import { syncDB } from './partners.js';
import imgData from '/img/gallery.json' with { type: 'json' };

const CAL = 'Y18xNjczMzQyM2YwZGE3ODA3MDRmZDY5NGVlNDdmYmZiZDJlN2QwYWFhYzBmMDc2NDY0YjQ5ZTAyNzk0YzRmNDEyQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20';
const [sheet, scoped] = useScopedStyle();
const STORE_NAME = 'partners';
const delay = 10_000;

const imgs = imgData.map(({ link, width, height, id, description }) => {
	const ext = link.split('.').pop();
	return el`<figure id="img-${id}">
		<img
			src="${link}"
			alt="${description || id}"
			width="${width.toString()}"
			height="${height.toString()}"
			srcset="
				https://i.imgur.com/${id}l.${ext} 640w,
				https://i.imgur.com/${id}h.${ext} 1024w,
				${link} ${width.toString()}w"
			sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, ${width.toString()}px"
			referrerpolicy="no-referrer"
			decoding="async"
			loading="lazy"
		>
		${description ? `<figcaption>${description}</figcaption>` : ''}
	</figure>`;
});

await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA }).then(async db => {
	try {
		await syncDB(db);
	} catch(err) {
		reportError(err);
	} finally {
		db.close();
	}
});

const orgCard = scoped`
	padding: 0.8em;

	& a.btn {
		font-size: 1em;
	}

	& .tags {
		margin-block-start: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 0.3em;
		overflow: auto;
		margin: 1.2em;
	}
`;

const snapClass = scoped`
	width: 100%;
	aspect-ratio: 16 / 9;
	overflow: auto;
	position: relative;
	will-change: scroll-position;

	& figure {
		margin: 0;
		width: 100%;
		height: 100%;
		overflow-x: hidden;

		& img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
			padding: 0;
			background-color: none;
		}

		& figcaption:not(:empty) {
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			width: 100%;
			min-height: 3rem;
			padding: 0.7rem 1.2rem;
			color: #fafafa;
			background-color: rgba(0, 0, 0, 0.7);
			backdrop-filter: blur(4px);
			text-decoration: none;
			text-align: center;
		}
	}

	&:fullscreen {
		background-color: #000;
		color: #e1e1e1;
		color-scheme: dark;
		max-width: 100dvw;
		font-size: 2.5vmin;
		cursor: none;

		& > *:not(figure) img {
			background-color: #fafafa;
			padding: 0.8em;
			border-radius: 6px;
			color: #202020;
		}
	}

	& > * {
		width: 100%;
		object-fit: cover;
		object-position: center;
		content-visibility: auto;
		contain-intrinsic-size: auto 100dvw 100dvh;
	}

	& > .current > + {
		content-visibility: visible;
	}

	weather-forecast {
		--background: #000;
		--color: #fafafa;
		background-color: #000;
		color: #fafafa;
	}
`;

const partnerFlex = scoped`
	display: flex;
	flex-wrap: nowrap;
	gap: 1.2em;

	& > img {
		flex: 0 1 60%;
		max-width: 60%;
		object-fit: cover;
		object-position: center;
		margin-inline-start: 16px;
	}

	& > b {
		flex: 1 1 40%;
		text-align: right;
		align-self: center;
		font-size: 2.2em;
		font-weight: bolder;
		margin-inline-end: 2em;
	}
`;

const createPartners = results => results.map(({ name, description, image, id, telephone, email, url, keywords }) => `<div id="${id}" class="${orgCard}" ${data({ orgName: name })}>
	<div class="${partnerFlex}">
		<img ${attr({ src: image.src, height: image.height, width: image.width, alt: name })} loading="lazy" crossorigin="anonymous" referrerpolicy="no-referrer" />
		<b class="partner-name">${name}</b>
	</div>
	<div class="flex row no-wrap tags">
		${Array.isArray(keywords) ? keywords.map(tag => `<a href="/resources/?category=${tag}" class="btn btn-primary">#${tag}</a>`).join('') : ''}
	</div>
	<p>${description}</p>
	<div>
		${typeof telephone === 'string' ? `<a href="tel:${telephone}" class="block btn btn-link">
			<svg class="icon" height="16" width="16" fill="currentColor" viewBox="0 0 16 16" role="presentation">
				<path d="M13.032 1c.534 0 .969.427.969.969v.062c-.017 6.613-5.383 11.97-12 11.97H1.97c-.545 0-.97-.447-.97-1v-3c0-.555.447-1 1-1h2c.555 0 1 .445 1 1v.468A8.967 8.967 0 0 0 10.47 5H10c-.553 0-1-.446-1-1V2c0-.554.447-1 1-1h3.032z"/>
			</svg>
			<span>${telephone.replace('+1-', '')}</span>
		</a>` : ''}
		${typeof email === 'string' ? `<a href="mailto:${email}" class="block btn btn-link">
		<svg class="icon" height="16" width="16" fill="currentColor" viewBox="0 0 14 16" role="presentation">
			<path fill-rule="evenodd" d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/>
			<path d="M2.781 4a1 1 0 0 0-.406 1.781l5 4 .625.5.625-.5 5-4a1 1 0 1 0-1.25-1.562L8 7.719l-4.375-3.5A1 1 0 0 0 2.781 4z" overflow="visible"/>
			<path d="M1.906 3A1 1 0 0 0 1 4v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2a1 1 0 0 0-.094 0zM3 5h10v7H3V5z" overflow="visible"/>
		</svg>
			<span>${email}</span>
		</a>` : ''}
		${typeof url === 'string' && URL.canParse(url) ? `<a href="${url}" class="block btn btn-link" role="noopener noreferrer external">
			<svg class="icon" height="16" width="12" fill="currentColor" viewBox="0 0 12 16" role="presentation">
					<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
			</svg>
			<span>${new URL(url).hostname}</span>
		</a>` : ''}
	</div>
</div>`).join('\n');

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

if (typeof customElements.get('weather-forecast') === 'undefined') {
	import('@shgysk8zer0/components/weather/forecast.js');
}

export default async ({ signal, stack }) => {
	/**
	 * @type {[IDBDatabase, HTMLElement, HTMLElement, HTMLElement]}
	 */
	const [db, HTMLScrollSnapElement, KRVEvents, WeatherForecast] = await Promise.all([
		openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA, stack }),
		customElements.whenDefined('scroll-snap'),
		customElements.whenDefined('krv-events'),
		customElements.whenDefined('weather-forecast'),
	]);

	const partners = await getAllItems(db, STORE_NAME, null, { signal });
	const scrollSnap = new HTMLScrollSnapElement();
	const cal = new KRVEvents();
	const frag = document.createDocumentFragment();
	const fullscreen = document.createElement('button');
	const reload = document.createElement('button');
	const label = document.createElement('b');
	const forecast = new WeatherForecast({
		appId: document.querySelector('weather-current').appId,
		postalCode: 93240,
	 });

	cal.theme = 'dark';
	forecast.theme = 'dark';
	label.slot = 'title';
	label.textContent = 'KRV Bridge Connection Events';
	cal.tags = ['krv-bridge'];
	scrollSnap.id = '_' + crypto.randomUUID();
	scrollSnap.classList.add(snapClass);
	scrollSnap.delay = delay;

	cal.append(label);
	scrollSnap.append(
		cal,
		forecast,
		createGoogleCalendar(CAL, {
			credentialless: true,
			title: 'KRV Food Calendar',
			showPrint: false,
		}),
		html`<div>
			<h3>Bridge to Well-being</h3>
			<p>The Bridge to Well-Being program assists with non-medical transportation to Kern River Valley residents by providing access to scheduled routes and Dial-a-Ride services provided by Kern Transit. Its goal is to offer access to transportation to those in need to promote mental and emotional well-being by offering residents the ability to go shopping, visit friends and family, attend events, utilize services at the KRV Bridge Connection, and to otherwise help alleviate the stress created by lack of transportation. Where the need is of a medical nature, other programs for non-emergency medical transportation should be used instead. This program is offered thanks to a grant from <b>Kern Family Health Care.</b></p>
			<div class="flex row space-around">
				<a href="/partners/krv-bridge-connection">
					<img src="/img/branding/krv-bridge-logo-wide.svg" alt="KRV Bridge Connection" width="340" loading="lazy" decoding="lazy" />
				</a>
				<a href="/resources/kern-family-health-care">
					<img src="/img/partners/kern-family-health-care.png" alt="Kern Family Health Care" width="340" loading="lazy" decoding="lazy" />
				</a>
			</div>
		</div>`,
		...imgs,
		html`${createPartners(partners.filter(result => result.partner))}`,
	);

	fullscreen.type = 'button';
	fullscreen.classList.add('btn', 'btn-primary');
	fullscreen.command = '--fullscreen';
	fullscreen.commandForElement = scrollSnap;
	fullscreen.textContent = 'Toggle Fullscreen';
	fullscreen.accessKey = 'f';

	reload.type = 'button';
	reload.classList.add('btn', 'btn-warning');
	reload.command = ROOT_COMMANDS.reload;
	reload.commandForElement = document.documentElement;
	reload.textContent = 'Reload';
	reload.accessKey = 'r';

	frag.append(scrollSnap, fullscreen, reload);

	return frag;
};

export const title = 'KRV Bridge Connection Digital Display';

export const description = 'Informational material for KRV Bridge Connection for digital displays';
