import { getAllItems, openDB } from '@aegisjsproject/idb';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { useScopedStyle } from '@aegisjsproject/core/parsers/css.js';
import { attr, data } from '@aegisjsproject/core/stringify.js';
import { COMMANDS, ROOT_COMMANDS } from '@aegisjsproject/commands/consts.js';
import { createGoogleCalendar } from '@shgysk8zer0/kazoo/google/calendar.js';
import { SCHEMA } from '../consts.js';
import { syncDB } from './partners.js';

const CAL = 'Y18xNjczMzQyM2YwZGE3ODA3MDRmZDY5NGVlNDdmYmZiZDJlN2QwYWFhYzBmMDc2NDY0YjQ5ZTAyNzk0YzRmNDEyQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20';
const [sheet, scoped] = useScopedStyle();
const STORE_NAME = 'partners';
const delay = 10_000;

const imgUrls = [
	'https://i.imgur.com/ym7h2wph.webp',
	'https://i.imgur.com/8gxA4Ooh.webp',
	'https://i.imgur.com/xpbJcQyh.webp',
	'https://i.imgur.com/DHxc9MBh.webp',
	'https://i.imgur.com/AuO9fIMh.webp',
	'https://i.imgur.com/wSTP041h.webp',
	'https://i.imgur.com/Gt6EsGAh.webp',
	'https://i.imgur.com/xi7ggBY.webp',
	// 'https://i.imgur.com/R7sxbi9h.webp',
	// 'https://i.imgur.com/ZrNwAxYh.webp',
	'https://i.imgur.com/TSeM5aUh.webp',
	// 'https://i.imgur.com/1e5kBLTh.webp',
	'https://i.imgur.com/ddVuSlQh.webp',
	'https://i.imgur.com/EIDSMj5h.webp',
];

const imgs = imgUrls.map((url, index) => {
	const img = document.createElement('img');
	const controller = new AbortController();
	const signal = controller.signal;
	const once = true;
	img.alt = `Image ${index + 1}`;
	img.addEventListener('load', ({ target }) => {
		target.width = target.naturalWidth;
		target.height = target.naturalHeight;
		controller.abort();
	}, { once, signal });

	img.addEventListener('error', ({ target }) => {
		const err = new DOMException(`Error loading image "${target.src}".`, 'NetworkError');
		controller.abort(err);
		target.remove();
	}, { once, signal });

	img.loading = 'lazy';
	img.decoding = 'async';
	img.fetchPriority = 'low';
	img.crossOrigin = 'anonymous';
	img.referrerPolicy = 'no-referrer';
	img.src = url;
	return img;
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
	height: 100dvh;
	overflow: auto;

	&:fullscreen {
		background-color: #000;
		color: #e1e1e1;
		color-scheme: dark;
		max-width: 100dvw;
		font-size: 2.5vmin;

		& > * img {
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
			<path fill-rule="evenodd" d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/></symbol><symbol id="mail-unread" viewBox="0 0 16 16">
			<path d="M2.781 4a1 1 0 0 0-.406 1.781l5 4 .625.5.625-.5 5-4a1 1 0 1 0-1.25-1.562L8 7.719l-4.375-3.5A1 1 0 0 0 2.781 4z" overflow="visible"/>
			<path d="M1.906 3A1 1 0 0 0 1 4v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2a1 1 0 0 0-.094 0zM3 5h10v7H3V5z" overflow="visible"/>
		</svg>
			<span>${email}</span>
		</a>` : ''}
		${typeof url === 'string' && URL.canParse(url) ? `<a href="${url}" class="block btn btn-link" role="noopener noreferrer external">
			<svg class="icon" height="16" width="12" fill="currentColor" viewBox="0 0 12 16" role="presentation">
				<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/></symbol><symbol id="chevron-down" viewBox="0 0 10 16"><path fill-rule="evenodd" d="M5 11L0 6l1.5-1.5L5 8.25 8.5 4.5 10 6l-5 5z"/></symbol><symbol id="comment" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M2 13h4v1H2v-1zm5-6H2v1h5V7zm2 3V8l-3 3 3 3v-2h5v-2H9zM4.5 9H2v1h2.5V9zM2 12h2.5v-1H2v1zm9 1h1v2c-.02.28-.11.52-.3.7-.19.18-.42.28-.7.3H1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h3c0-1.11.89-2 2-2 1.11 0 2 .89 2 2h3c.55 0 1 .45 1 1v5h-1V6H1v9h10v-2zM2 5h8c0-.55-.45-1-1-1H8c-.55 0-1-.45-1-1s-.45-1-1-1-1 .45-1 1-.45 1-1 1H3c-.55 0-1 .45-1 1z"/></symbol><symbol id="inbox" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M14 9l-1.13-7.14c-.08-.48-.5-.86-1-.86H2.13c-.5 0-.92.38-1 .86L0 9v5c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V9zm-3.28.55l-.44.89c-.17.34-.52.56-.91.56H4.61c-.38 0-.72-.22-.89-.55l-.44-.91c-.17-.33-.52-.55-.89-.55H1l1-7h10l1 7h-1.38c-.39 0-.73.22-.91.55l.01.01z"/></symbol><symbol id="creative-commons-by-sa" viewBox="0 0 119.99902 42.001411">
				<g transform="matrix(.99378 0 0 .99367 -177.694 -74.436)">
					<path fill="#aab2ab" d="M182.24 75.39l114.06.203c1.59 0 3.02-.237 3.02 3.18l-.14 37.567H179.36V78.634c0-1.685.16-3.244 2.88-3.244z"/>
					<path d="M213.544 94.607c.01 7.577-6.136 13.723-13.713 13.728-7.576.004-13.722-6.135-13.73-13.712v-.016c0-7.58 6.136-13.724 13.713-13.73 7.577-.004 13.723 6.136 13.73 13.713v.017z" fill="#fff"/>
					<path d="M210.97 83.428c3.046 3.047 4.565 6.774 4.565 11.182 0 4.4-1.493 8.092-4.487 11.05-3.17 3.126-6.922 4.69-11.243 4.69-4.278 0-7.96-1.555-11.06-4.645-3.1-3.1-4.644-6.8-4.644-11.095 0-4.303 1.546-8.03 4.645-11.182 3.02-3.038 6.704-4.565 11.06-4.565 4.4 0 8.126 1.527 11.164 4.565zm-20.174 2.05c-2.575 2.594-3.858 5.64-3.858 9.132s1.274 6.512 3.814 9.052c2.55 2.55 5.578 3.824 9.096 3.824s6.573-1.292 9.166-3.86c2.47-2.39 3.7-5.393 3.7-9.016 0-3.596-1.247-6.643-3.752-9.148-2.506-2.514-5.544-3.762-9.114-3.762s-6.59 1.257-9.052 3.78zm6.765 7.596c-.392-.856-.976-1.283-1.762-1.283-1.388 0-2.086.935-2.086 2.803s.698 2.802 2.086 2.802c.916 0 1.57-.463 1.964-1.37l1.92 1.02c-.916 1.633-2.295 2.445-4.13 2.445-1.413 0-2.54-.428-3.394-1.3-.847-.865-1.275-2.06-1.275-3.58 0-1.5.437-2.688 1.318-3.57.874-.882 1.966-1.318 3.275-1.318 1.938 0 3.326.76 4.172 2.287l-2.086 1.064zm9.045 0c-.393-.856-.97-1.283-1.73-1.283-1.413 0-2.12.935-2.12 2.803s.707 2.802 2.12 2.802c.918 0 1.564-.463 1.93-1.37l1.964 1.02c-.917 1.633-2.288 2.445-4.12 2.445-1.406 0-2.54-.428-3.388-1.3-.855-.865-1.274-2.06-1.274-3.58 0-1.5.428-2.688 1.292-3.57s1.964-1.318 3.29-1.318c1.94 0 3.327.76 4.165 2.287l-2.13 1.064z"/>
					<path d="M297.3 74.91H181.07a2.26 2.26 0 0 0-2.26 2.262v39.498c0 .28.22.51.51.51h119.73c.28 0 .51-.23.51-.51V77.172c0-1.247-1.02-2.26-2.26-2.26zm-116.23 1.022H297.3c.68 0 1.24.556 1.24 1.24v27.418h-83.08c-3.04 5.51-8.91 9.24-15.64 9.24-6.74 0-12.6-3.73-15.65-9.24h-4.34V77.172c0-.684.55-1.24 1.24-1.24z"/>
					<path d="M265.61 112.88c.08.16.19.29.32.38.13.1.29.17.47.22.18.04.37.07.56.07.13 0 .27-.01.42-.04.15-.02.29-.06.42-.12s.24-.15.32-.26a.63.63 0 0 0 .13-.41c0-.18-.05-.33-.17-.44-.11-.12-.26-.21-.45-.28-.19-.08-.4-.14-.63-.2-.24-.06-.48-.12-.72-.19-.25-.06-.49-.13-.73-.22-.23-.09-.45-.21-.63-.35-.19-.15-.34-.33-.45-.54-.12-.22-.18-.48-.18-.78 0-.34.08-.64.22-.89.15-.25.34-.46.58-.63.23-.17.5-.3.8-.38s.59-.12.89-.12c.35 0 .69.04 1.01.12.31.08.6.2.85.38.25.17.44.4.59.67s.22.6.22.98h-1.42c-.01-.2-.06-.36-.13-.49s-.16-.24-.28-.31c-.12-.08-.25-.13-.4-.16-.16-.03-.32-.05-.5-.05-.12 0-.24.02-.35.04-.12.03-.23.07-.32.13-.1.06-.18.14-.24.23-.06.1-.09.22-.09.36 0 .13.02.24.07.32s.15.15.29.22c.15.07.35.14.61.21s.59.15 1.01.26c.12.02.3.07.52.13.22.07.44.17.65.32.22.14.41.33.57.57s.24.55.24.92c0 .31-.06.59-.18.85s-.3.49-.53.68-.52.33-.87.44c-.34.11-.74.16-1.2.16-.36 0-.72-.05-1.06-.14-.35-.09-.65-.23-.92-.42-.26-.2-.47-.44-.63-.74-.15-.3-.23-.65-.22-1.07h1.42c0 .23.04.42.12.57zm8.26-5.01l2.49 6.66h-1.52l-.51-1.48h-2.49l-.52 1.48h-1.48l2.52-6.66h1.51zm.08 4.08l-.84-2.44h-.02l-.87 2.44h1.73zm-34.77-4.08c.32 0 .61.03.87.08.26.06.48.15.67.28.19.12.33.29.44.5.1.22.15.48.15.79 0 .33-.08.61-.23.84-.15.22-.38.4-.68.55.41.12.72.32.93.62.2.29.3.65.3 1.07 0 .33-.07.63-.2.87-.13.25-.3.45-.52.6-.23.16-.48.27-.76.35-.29.07-.58.11-.88.11h-3.23v-6.66h3.14zm-.19 2.69c.26 0 .48-.06.65-.18.16-.13.25-.33.25-.61 0-.15-.03-.28-.09-.38a.544.544 0 0 0-.22-.23c-.09-.06-.2-.1-.32-.12s-.25-.03-.38-.03h-1.37v1.55h1.48zm.09 2.83c.14 0 .28-.01.41-.04s.24-.08.34-.14c.1-.07.18-.16.24-.27s.09-.25.09-.43c0-.34-.1-.58-.29-.73-.19-.14-.45-.22-.77-.22h-1.59v1.83h1.57zm2.81-5.52h1.64l1.56 2.63 1.55-2.63h1.64l-2.48 4.1v2.56h-1.46v-2.59l-2.45-4.07zm39.96-17.89c.005 5.888-4.764 10.656-10.645 10.662S260.55 95.88 260.55 90v-.02c-.008-5.88 4.76-10.65 10.642-10.656s10.657 4.762 10.657 10.644v.012z" fill="#fff"/>
					<path d="M271.123 78.314c-3.232 0-5.97 1.128-8.207 3.383-2.3 2.334-3.45 5.096-3.45 8.285s1.15 5.933 3.45 8.227c2.294 2.294 5.03 3.442 8.206 3.442 3.213 0 5.994-1.158 8.357-3.472 2.217-2.198 3.324-4.93 3.324-8.198 0-3.266-1.125-6.03-3.388-8.285-2.256-2.255-5.025-3.383-8.294-3.383zm.03 2.1c2.644 0 4.894.933 6.744 2.8 1.87 1.848 2.807 4.104 2.807 6.768 0 2.684-.913 4.91-2.744 6.68-1.93 1.907-4.2 2.86-6.806 2.86-2.613 0-4.863-.943-6.75-2.83-1.888-1.886-2.83-4.123-2.83-6.71-.002-2.586.948-4.842 2.86-6.768 1.832-1.867 4.07-2.8 6.72-2.8z"/>
					<path d="M265.947 88.336c.47-2.937 2.538-4.505 5.125-4.505 3.725 0 5.994 2.704 5.994 6.308 0 3.517-2.412 6.25-6.05 6.25-2.506 0-4.744-1.54-5.156-4.564h2.944c.087 1.57 1.106 2.122 2.562 2.122 1.656 0 2.73-1.54 2.73-3.895 0-2.47-.93-3.777-2.674-3.777-1.28 0-2.387.465-2.618 2.063l.856-.005-2.32 2.315-2.31-2.314.917.006z"/>
					<circle cy="90.225" cx="242.56" r="10.806" fill="#fff"/>
					<path d="M245.69 87.098a.754.754 0 0 0-.75-.754h-4.78c-.41 0-.75.337-.75.754v4.773h1.33v5.653h3.62V91.87h1.33V87.1z"/>
					<circle cy="84.083" cx="242.55" r="1.632"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M242.53 78.318c-3.23 0-5.96 1.128-8.2 3.384-2.3 2.333-3.45 5.095-3.45 8.284s1.15 5.932 3.45 8.227c2.29 2.297 5.03 3.447 8.2 3.447 3.22 0 6-1.16 8.36-3.476 2.22-2.197 3.33-4.93 3.33-8.198 0-3.267-1.13-6.028-3.39-8.284s-5.02-3.384-8.3-3.384zm.03 2.1c2.65 0 4.9.934 6.75 2.8 1.87 1.848 2.81 4.104 2.81 6.768 0 2.684-.92 4.91-2.75 6.68-1.93 1.907-4.2 2.86-6.81 2.86s-4.85-.943-6.74-2.83c-1.89-1.886-2.84-4.123-2.84-6.71 0-2.586.96-4.842 2.87-6.767 1.83-1.868 4.07-2.802 6.71-2.802z"/>
				</g>
			</svg>
			<span>${new URL(url).hostname}</span>
		</a>` : ''}
	</div>
</div>`).join('\n');

document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

if (typeof customElements.get('weather-forecast') === 'undefined') {
	import('@shgysk8zer0/components/weather/forecast.js');
}

export default async ({ signal }) => {
	const [db, HTMLScrollSnapElement, KRVEvents, WeatherForecast] = await Promise.all([
		openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA }),
		customElements.whenDefined('scroll-snap'),
		customElements.whenDefined('krv-events'),
		customElements.whenDefined('weather-forecast'),
	]);

	try {
		const partners = await getAllItems(db, STORE_NAME, null, { signal });
		db.close();
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
		scrollSnap.addEventListener('command', ({ currentTarget, command }) => {
			if (command !== COMMANDS.toggleFullscreen) {
				return;
			} else if (currentTarget.isSameNode(document.fullscreenElement)) {
				document.exitFullscreen();
			} else {
				currentTarget.requestFullscreen();
			}
		}, { passive: true, signal });

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
		fullscreen.command = COMMANDS.toggleFullscreen;
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
	} catch(err) {
		db.close();
		throw err;
	}
};

export const title = 'KRV Bridge Connection Digital Display';

export const description = 'Informational material for KRV Bridge Connection for digital displays';
