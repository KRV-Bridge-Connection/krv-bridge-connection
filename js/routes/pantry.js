import { site, PANTRY_OPENING_HOURS } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';

const MESSAGE = 'Online registration has been disabled due to the new pantry system.';
const CAL_BENEFITS = 'https://benefitscal.com/';
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
	<p>Please be aware that scheduling is limited to pantry days and hours, and visits may not be made when pantry is closed or low on food. See the <a href="${location.pathname}#general-pantry-hours">Schedule.</a></p>
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
</section>`;

export const title = `Emergency Choice Food Pantry - ${site.title}`;

export const description = 'Emergenct Choice Food Pantry - In partnership with CAPK';
