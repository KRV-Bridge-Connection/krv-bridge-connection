import { site, PANTRY_OPENING_HOURS } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';

const CAL_BENEFITS = 'https://benefitscal.com/';
const OASIS_KIOSK = 'https://capkfoodbank.oasisinsight.net/kiosk/87a403e6d6edce481daca0e7a65478f93f78b84a110c3e69e1d0eb7123167f67/';
const OASIS_ID = 'oasis-dialog';
const MESSAGE = `Online registration has been disabled due to the <button type="btn" class="btn btn-link" command="show-modal" commandfor="${OASIS_ID}">new pantry system</button>.`;
// const CARES_FORM = '/docs/cares-form.pdf';
// Options given on Neighbor Intake
export const TOWNS = ['South Lake', 'Weldon', 'Mt Mesa', 'Lake Isabella', 'Bodfish', 'Wofford Heights', 'Kernville'];
export const ZIPS = [95949, 93240, 93283, 93205, 93285, 93238, 93255, 93518];

const timeFormatter = new Intl.DateTimeFormat(navigator.language, { timeStyle: 'short' });

const style = css`#pantry-message {
	max-width: min(800px, 95%);
}

#pantry-date:not(:invalid) + #pantry-date-invalid,
#pantry-time:not(:invalid) + #pantry-time-invalid {
	visibility: hidden;
}

#pantry-message .btns {
	justify-content: center;
	gap: 0.8rem;
}`;

const getPantrySchedule = () => `<section class="pantry-general-hours" aria-labelledby="general-pantry-hours">
	<h3 id="general-pantry-hours">General Pantry Hours</h3>
	<p>Please be aware that this schedule does not reflect closures due to holidays or unexpected circumstances.</p>
	<ul>
		${PANTRY_OPENING_HOURS.map(({ dayOfWeek, opens, closes }) => `<li itemprop="hoursAvailable" itemtype="https://schema.org/OpeningHoursSpecification" itemscope="">
			<span itemprop="dayOfWeek">${dayOfWeek}</span>
			${typeof opens === 'string' && typeof closes === 'string' /* eslint-disable indent */
				? `<time itemprop="opens" datetime="${opens}">${timeFormatter.format(new Date(`2025-08-29T${opens}`))}</time> &mdash; <time itemprop="closes" datetime="${closes}">${timeFormatter.format(new Date(`2025-08-29T${closes}`))}</time>`
				: '<meta itemprop="opens" content="00:00" /><meta itemprop="closes" content="00:00" /><strong>Closed</strong>' /* eslint-enable indent */}
		</li>`).join('')}
	</ul>
</section>`;

export const postalCodes = {
	'alta sierra': '95949',
	'weldon': '93283',
	'bodfish': '93205',
	'south lake': '93240',
	'mt mesa': '93240',
	'mountain mesa': '93240',
	'wofford heights': '93285',
	'lake isabella': '93240',
	'kernville': '93238',
	'onyx': '93255',
	'canebrake': '93255',
	'havilah': '93518',
	'caliente': '93518',
	'squirrel mountain valley': '93240',
	'squirrel valley': '93240',
	'keyesville': '93240',
	'keysville': '93240',
};

export const updateZip = registerCallback('pantry:form:zip-update', ({ target: { value, form } }) => {
	const val = value.toLowerCase().replaceAll(/[^A-Za-z ]/g, '');

	if (typeof postalCodes[val] === 'string') {
		form.elements.namedItem('postalCode').value = postalCodes[val];
	}
});

document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];

export default () => html`<section aria-labelledby="pantry-header">
	<h3>Emergency Choice Pantry</h3>
	${typeof MESSAGE === 'string' ? `<div class="status-box info"><p>${MESSAGE}</p></div><br />` : '' }
	<img srcset="https://i.imgur.com/h68vmgFt.jpeg 90w,
		https://i.imgur.com/h68vmgFm.jpeg 160w,
		https://i.imgur.com/h68vmgFl.jpeg 320w,
		https://i.imgur.com/h68vmgFh.jpeg 640w,
		https://i.imgur.com/h68vmgF.jpeg 2500w"
	class="full-width"
	sizes="(max-width: 800px) 100vw, calc(100vw - 400px)"
	width="640"
	height="482"
	src="https://i.imgur.com/h68vmgFh.jpeg"
	alt="KRV Bridge Food Pantry"
	loading="lazy"
	decoding="async"
	crossorigin="anonymous"
	itemprop="image"
	referrerpolicy="no-referrer" />
	<p itemprop="description">The Choice Pantry is designed to provide emergency food assistance. It's for community members who are facing a
		temporary food crisis and need help filling the gaps when other resources, like SNAP benefits and food distributions,
		are not enough.</p>
	<p>As a choice pantry, it offers an experience more like shipping where guests are allowed to pick out their own
	food that they want rather than a preset box of items.
	The Choice Pantry is available up to twice within a rolling one-month period and provides food based on household size.</p>
	<p>
		Apply for food assistance in California through the official
		<a href="${CAL_BENEFITS}" class="btn btn-link" target="_blank" rel="noopener noreferrer">
			<span>CalFresh (SNAP/Food Stamps)</span>
			<svg class="icon" width="18" height="18" fill="currentColor" role="presentation" aria-hidden="true">
				<use href="/img/icons.svg#link-external"></use>
			</svg>
		</a>
		website.
	</p>
</section>
<section itemprop="address" itemtype="https://schema.org/PostalAddress" aria-labelledby="pantry-address" itemscope="">
	<meta itemprop="name" content="KRV Bridge Connection" />
	<h3 id="pantry-address">Address</h3>
	<div itemprop="streetAddress">6069 Lake Isabella Blvd.</div>
	<div>
		<span itemprop="addressLocality">Lake Isabella</span>,
		<span itemprop="addressRegion">CA</span>
		<meta itemprop="postalCode" content="93240" />
		<meta itemprop="addressCountry" content="US" />
	</div>
</section>
<section>
	<p>To register in the new Oasis Platform used throughout Kern County, <button type="button" class="btn btn-outline-secondary" command="show-modal" commandfor="${OASIS_ID}">Click here</button></p>
	${getPantrySchedule()}
	<p>
		<span>For other KRV Food Distributions, please see the</span>
		<a href="/food/">
			<svg class="icon" width="16" height="16" fill="currentColor" role="presentation" aria-hidden="true">
				<use href="/img/icons.svg#link"></use>
			</svg>
			<span>Calendar</span>
		</a>
	</p>
</section>
<dialog id="${OASIS_ID}">
	<p>All CAPK associated food programs are now using the Oasis Platform.
	<div class="center">
		<a href="${OASIS_KIOSK}" class="btn btn-primary" rel="noopener noreferrer" target="_blank">
			<span>Sign-Up</span>
			<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" class="icon" role="presentation" aria-hidden="true">
				<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
			 </svg>
		</a>
		<button type="button" class="btn btn-danger" command="request-close" commandfor="${OASIS_ID}">
			<span>Dismiss</span>
			<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="12" height="16" viewBox="0 0 12 16" class="icon" role="presentation" aria-hidden="true">
				<path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/>
			</svg>
		</button>
	</div>
</dialog>`;

export const title = `Emergency Choice Food Pantry - ${site.title}`;

export const description = 'Emergenct Choice Food Pantry - In partnership with CAPK';
