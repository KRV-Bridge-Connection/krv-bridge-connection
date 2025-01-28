import { htmlUnsafe } from '@aegisjsproject/core/parsers/html.js'; // unsafe allows setting `<form action="...">`
import { css } from '@aegisjsproject/core/parsers/css.js';
import { svg } from '@aegisjsproject/core/parsers/svg.js';
import { properties } from '@aegisjsproject/styles/properties.js';
import { componentBase, componentLightTheme, componentDarkTheme } from '@aegisjsproject/styles/theme.js';
import { displays } from '@aegisjsproject/styles/misc.js';
import { forms } from '@aegisjsproject/styles/forms.js';
import { btn, btnSuccess, btnLink } from '@aegisjsproject/styles/button.js';

const SEARCH = 'https://www.211ca.org/search';

const linkIcon = svg`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16" fill="currentColor" part="icon link-icon" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M11 10h1v3c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h3v1H1v10h10v-3zM6 2l2.25 2.25L5 7.5 6.5 9l3.25-3.25L12 8V2H6z"/>
</svg>`;

const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" part="icon search-icon" role="presentation" aria-hidden="true">
	<path fill-rule="evenodd" d="M15.7 13.3l-3.81-3.83A5.93 5.93 0 0 0 13 6c0-3.31-2.69-6-6-6S1 2.69 1 6s2.69 6 6 6c1.3 0 2.48-.41 3.47-1.11l3.83 3.81c.19.2.45.3.7.3.25 0 .52-.09.7-.3a.996.996 0 0 0 0-1.41v.01zM7 10.7c-2.59 0-4.7-2.11-4.7-4.7 0-2.59 2.11-4.7 4.7-4.7 2.59 0 4.7 2.11 4.7 4.7 0 2.59-2.11 4.7-4.7 4.7z"/>
</svg>`;

const template = htmlUnsafe`
<form action="https://www.211ca.org/search" method="GET" target="_blank" rel="noopener noreferrer external" part="form container">
	<fieldset class="no-border">
		<legend part="legend">
			<slot name="legend">Search 2-1-1</slot>
		</legend>
		<div part="about">211 is a free information and referral service that connects people to health and human services in their community 24 hours a day, 7 days a week.</div>
		<div class="form-group">
			<label for="211-search" class="input-label required" part="label">
				<slot name="label">How can we help?</slot>
			</label>
			<input type="search" name="search" id="211-search" class="input" part="input" placeholder="What are you searching for?" list="211-suggestions" autocomplete="off" required="">
			<datalist id="211-suggestions"></datalist>
			<input type="hidden" name="location" id="211-location" />
		</div>
	</fieldset>
	<div class="flex row">
		<button type="submit" class="btn btn-lg btn-success" part="btn submit-button">
			${searchIcon}
			<slot name="submit-text">Find Help</slot>
		</button>
		<a href="https://www.211ca.org/about-2-1-1" id="about-211" class="btn btn-link btn-lg" part="link about-link" rel="noopener noreferrer external" target="_blank">
			<slot name="about-icon">${linkIcon.outerHTML}</slot>
			<slot name="about-text">More information</slot>
		</a>
	</div>
</form>
<br />
<section id="211-links" part="suggestions">
	<h2 part="suggestion-heading">
		<slot name="suggestion-heading">Quick Links</slot>
	</h2>
	<div class="flex row wrap" id="suggestion-links"></div>
</section>
<slot id="suggestions-list" name="suggestions" hidden=""></slot>`;

const styles = css`:host {
	padding: 1.3em;
}

.no-border {
	border: none;
}`;

export class Search211Component extends HTMLElement {
	#shadow;
	#isConnected = false;
	#suggestions = [
		'Food',
		'Housing',
		'Healthcare',
		'Disaster Relief and Recovery',
		'Rent assistance',
		'Utility assistance',
		'Transportation',
		'Drugs and addiction',
		'Mental health',
	];

	constructor(zip) {
		super();

		this.#shadow = this.attachShadow({ mode: 'closed' });
		this.#shadow.adoptedStyleSheets = [
			properties, componentBase, componentLightTheme, componentDarkTheme, displays,
			forms, btn, btnLink, btnSuccess, styles,
		];

		this.#shadow.append(template.cloneNode(true));
		this.#shadow.getElementById('suggestions-list').addEventListener('slotchange', ({ target }) => {
			this.#suggestions = Array.from(target.assignedElements(), el => el.textContent.trim());

			if (this.#isConnected) {
				this.#updateSuggestions();
			}
		});

		if (typeof zip === 'number') {
			this.zip = zip;
		}
	}

	connectedCallback() {
		this.#updateSuggestions();
		this.#isConnected = true;
	}

	disconnectedCallback() {
		this.#isConnected = false;
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
			case 'zip':
				if (typeof newVal === 'string' && newVal.length !== 0) {
					this.#shadow.getElementById('about-211').value = newVal;

					this.#shadow.querySelectorAll('.suggestion-link').forEach(a => {
						const url = new URL(a.href);
						url.searchParams.set('location', newVal);
						a.href = url.href;
					});
				} else {
					this.#shadow.getElementById('about-211').value = null;

					this.#shadow.querySelectorAll('.suggestion-link').forEach(a => {
						const url = new URL(a.href);
						url.searchParams.delete('location');
						a.href = url.href;
					});
				}
				break;

			default:
				throw new Error(`Invalid attribute changed: ${name}.`);
		}
	}

	get theme() {
		return this.getAttribute('theme') ?? 'auto';
	}

	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	get zip() {
		return parseInt(this.getAttribute('zip'));
	}

	set zip(val) {
		if (Number.isSafeInteger(val) && val > 10000 && val < 100000) {
			this.setAttribute('zip', val.toString());
		} else if (typeof val === 'string') {
			this.zip = parseInt(val);
		} else {
			throw new TypeError('Invalid zip value.');
		}
	}

	#updateSuggestions() {
		const datalist = this.#shadow.getElementById('211-suggestions');
		const links = this.#shadow.getElementById('211-links');
		const zip = this.zip;

		datalist.replaceChildren(...this.#suggestions.map(suggestion => {
			const option = document.createElement('option');

			option.label = suggestion;
			option.value = suggestion;

			return option;
		}));

		links.replaceChildren(...this.#suggestions.map(suggestion => {
			const a = document.createElement('a');
			const url = new URL(SEARCH);
			const text = document.createElement('span');

			url.searchParams.set('search', suggestion);
			url.searchParams.set('location', zip);

			a.classList.add('btn', 'btn-link', 'suggestion-link');
			a.part.add('link', 'suggested-link');
			a.relList.add('noopener', 'noreferrer', 'external');

			text.textContent = suggestion;
			text.part.add('suggestion');

			a.append(linkIcon.cloneNode(true), text);
			a.href = url.href;

			return a;
		}));
	}

	static get observedAttributes() {
		return ['zip'];
	}
}

customElements.define('search-211', Search211Component);
