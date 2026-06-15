import { site } from '../consts.js';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';

const CAL_BENEFITS = 'https://benefitscal.com/';
const MESSAGE = null;

export const styles = css`#pantry-message {
	max-width: min(800px, 95%);
}

#pantry-message .btns {
	justify-content: center;
	gap: 0.8rem;
}`;

export default async () => {
	return html`<section aria-labelledby="pantry-header">
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
		<p>As a choice pantry, it offers an experience more like shopping where guests are allowed to pick out their own
		food that they want rather than a preset box of items.
		The Choice Pantry is available up to twice per month (every two weeks) and provides food based on household size.</p>
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
	<section class="pantry-general-hours" aria-labelledby="general-pantry-hours">
		<h3 id="general-pantry-hours">General Pantry Hours</h3>
		<p>
			<span>Salvation Army posts weekly schedules on their</span>
			<a href="https://www.facebook.com/profile.php?id=61574323912303" rel="noopener noreferrer external" target="_blank" class="btn btn-link">
				<span>Facebook Page</span>
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" class="icon" fill="currentColor" role="presentation" aria-hidden="true">
					<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
				</svg>
			</a>.
		</p>
		<p>
			<span>For all questions regarding the Salvation Army Choice Pantry, place call</span>
				<a href="tel:+1-760-417-3056" class="btn btn-primary">
					<svg height="16" width="16" viewBox="0 0 16 16" class="icon" fill="currentColor" role="presentation" aria-hidden="true">
						 <path d="M13.032 1c.534 0 .969.427.969.969v.062c-.017 6.613-5.383 11.97-12 11.97H1.97c-.545 0-.97-.447-.97-1v-3c0-.555.447-1 1-1h2c.555 0 1 .445 1 1v.468A8.967 8.967 0 0 0 10.47 5H10c-.553 0-1-.446-1-1V2c0-.554.447-1 1-1h3.032z"/>
					</svg>
					<span>(760) 417-3056</span>
				</a>.
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
	</section>`;
};

export const title = `Emergency Choice Food Pantry - ${site.title}`;

export const description = 'Emergenct Choice Food Pantry - In partnership with CAPK';
