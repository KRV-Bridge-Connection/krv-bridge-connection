import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { componentBase } from '@aegisjsproject/styles/theme.js';
import reset from '@aegisjsproject/styles/css/reset.css' with { type: 'css' };
import palette from '@aegisjsproject/styles/css/palette.css' with { type: 'css' };
import layers from '@aegisjsproject/styles/css/layers.css' with { type: 'css' };
import button from '@aegisjsproject/styles/css/button.css' with { type: 'css' };
import data from 'https://krvbridge.org/partners.json' with { type: 'json' };

const resources = data.partners;

const sheet = css`@layer component {
	.wrapper {
		background-color: light-dark(var(--gray-100), var(--gray-900));
		color: light-dark(var(--gray-900), var(--gray-200));
		padding: 1rem;
		border-radius: 8px;

		& .search-bar {
			display: flex;
			gap: 0.5rem;
			margin-bottom: 1.5rem;

			& input[type='search'] {
				flex: 1;
				padding: 0.5rem 1rem;
				border: 1px solid light-dark(var(--gray-400), var(--gray-700));
				background-color: light-dark(var(--gray-100), var(--gray-800));
				color: light-dark(var(--gray-900), var(--gray-100));
				border-radius: 4px;
				font-size: 1rem;
			}
		}

		& .list {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: 1rem;
		}

		& .card {
			padding: 1.2rem;
			border: 1px solid light-dark(var(--gray-300), var(--gray-800));
			border-radius: 6px;
			background-color: light-dark(var(--gray-100), var(--gray-900));
			flex-direction: column;
			gap: 0.5rem;
			transition: transform 250ms ease-out;

			&:not([hidden]) {
				display: flex;
			}

			&:hover {
				transform: scale(1.1) rotate(-2deg);
			}

			& .card-logo {
				max-width: 100%;
				height: auto;
				max-height: 60px;
				object-fit: contain;
				align-self: flex-start;
				margin-bottom: 0.5rem;
			}

			& h3 {
				margin: 0;
				font-size: 1.2rem;
				color: light-dark(var(--blue-700), var(--blue-300));
			}

			& p {
				margin: 0;
				font-size: 0.9rem;
				line-height: 1.4;
				color: light-dark(var(--gray-700), var(--gray-400));
			}

			& .meta {
				font-size: 0.85rem;
				color: light-dark(var(--gray-600), var(--gray-500));
			}

			& .tags {
				display: flex;
				flex-wrap: wrap;
				gap: 0.4rem;
				margin-top: auto;
				padding-top: 0.5rem;

				& .tag {
					padding: 0.2rem 0.6rem;
					font-size: 0.75rem;
					background-color: light-dark(var(--gray-200), var(--gray-800));
					border-radius: 12px;
					color: light-dark(var(--gray-800), var(--gray-300));
					cursor: pointer;
					transition: background-color 0.2s ease;

					&:hover {
						background-color: light-dark(var(--gray-300), var(--gray-700));
					}
				}
			}
		}
	}

	a {
		color: inherit;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
}`;

export class KRVBridgePartners extends HTMLElement {
	#shadow = this.attachShadow({ mode: 'closed' });
	#isInitialized = false;
	#listContainer;
	#searchInput;
	#cards = [];
	#stack = new DisposableStack();
	#controller;
	#resolvers = Promise.withResolvers();

	constructor() {
		super();
		this.#shadow.adoptedStyleSheets = [layers, reset, palette, componentBase, button, sheet];

		this.#renderLayout();
		this.#buildCards();

		this.#isInitialized = true;
		this.#filterCards(false);
	}

	static get observedAttributes() {
		return ['partners', 'keyword'];
	}

	get partners() {
		return this.hasAttribute('partners');
	}

	set partners(val) {
		this.toggleAttribute('partners', val);
	}

	get keyword() {
		return this.getAttribute('keyword') || '';
	}

	set keyword(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('keyword', val);
		} else {
			this.removeAttribute('keyword');
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (! this.#stack?.disposed) {
			if (oldValue !== newValue) {
				if (name === 'keyword' && this.#searchInput) {
					this.#searchInput.value = newValue || '';
				}
				if (this.#isInitialized) {
					this.#filterCards(true);
				}
			}
		}
	}

	connectedCallback() {
		if (! this.#stack.disposed) {
			this.#controller = this.#stack.adopt(new AbortController(), controller => controller.abort());
			this.#resolvers.resolve();
		}
	}

	disconnectedCallback() {
		this.#controller.abort();
	}

	[Symbol.dispose]() {
		this.#stack.dispose();
		this.#shadow.querySelectorAll('button, fieldset, input').forEach(el => el.disabled = true);
	}

	async #renderLayout() {
		await this.#resolvers.promise;
		const uniqueKeywords = Array.from(
			new Set((data.partners || []).flatMap(item => item.keywords || []))
		).sort();

		const frag = html`
			<search class="wrapper" part="wrapper">
				<form class="search-bar" part="search-bar">
					<input type="search" placeholder="Search by keyword or name..." list="keyword-suggestions" part="search-input">
					<datalist id="keyword-suggestions">
						${uniqueKeywords.map(kw => `<option value="${kw}"></option>`).join('')}
					</datalist>
					<button type="submit" class="btn btn-success" part="submit-button">Search</button>
					<button type="button" class="btn btn-danger clear-btn" part="clear-button">Clear</button>
				</form>
				<div class="list" part="list"></div>
			</search>
		`;

		const wrapper = frag.firstElementChild;
		const searchBar = wrapper.querySelector('form');
		this.#searchInput = searchBar.querySelector('input');
		const clearBtn = searchBar.querySelector('.clear-btn');
		this.#listContainer = wrapper.querySelector('.list');

		this.#searchInput.value = this.keyword;

		searchBar.addEventListener('submit', (e) => {
			e.preventDefault();
			this.keyword = this.#searchInput.value;
		}, { signal: this.#controller.signal });

		clearBtn.addEventListener('click', () => {
			this.#searchInput.value = '';
			this.keyword = '';
		}, { passive: true, signal: this.#controller.signal });

		this.#shadow.append(frag);
	}

	async #buildCards() {
		await this.#resolvers.promise;
		const partnersData = data.partners || [];

		partnersData.forEach(item => {
			const rawSrc = item.image?.src || item.image?.url;
			const imgSrc = rawSrc ? new URL(rawSrc, 'https://krvbridge.org').href : '';
			const imgWidth = item.image?.width ? `width="${item.image.width}"` : '';
			const imgHeight = item.image?.height ? `height="${item.image.height}"` : '';

			const frag = html`
				<div class="card" part="card">
					${imgSrc ? `<img src="${imgSrc}" alt="${item.name} logo" class="card-logo" loading="lazy" part="card-logo" ${imgWidth}${imgHeight}>` : ''}
					<h3 part="card-title">
						${item.url ? `<a href="${item.url}" target="_blank" part="card-link">${item.name}</a>` : item.name}
					</h3>
					<p part="card-description">${item.description || ''}</p>
					${(item.telephone || item.email) ? `
						<div class="meta" part="card-meta">
							${item.telephone ? `<span part="phone-label">Phone: <a href="tel:${item.telephone.replace(/\s+/g, '')}" part="phone-link">${item.telephone}</a></span>` : ''}
							${(item.telephone && item.email) ? '<span part="meta-separator"> | </span>' : ''}
							${item.email ? `<span part="email-label">Email: <a href="mailto:${item.email.trim()}" part="email-link">${item.email}</a></span>` : ''}
						</div>
					` : ''}
					${(item.keywords && item.keywords.length > 0) ? `
						<div class="tags" part="tags">
							${item.keywords.map(kw => `<span class="tag" part="tag" data-kw="${kw}">${kw}</span>`).join('')}
						</div>
					` : ''}
				</div>
			`;

			const card = frag.firstElementChild;

			card.querySelectorAll('.tag').forEach(tagEl => {
				tagEl.addEventListener('click', () => {
					this.keyword = tagEl.dataset.kw;
				}, { passive: true, signal: this.#controller.signal });
			});

			const nameMatch = item.name?.toLowerCase() || '';
			const descMatch = item.description?.toLowerCase() || '';
			const keywordMatch = item.keywords?.map(k => k.toLowerCase()).join(' ') || '';

			this.#cards.push({
				element: card,
				isPartner: item.partner === true,
				searchableText: `${nameMatch} ${descMatch} ${keywordMatch}`
			});

			this.#listContainer.append(frag);
		});
	}

	#filterCards(useTransition = true) {
		const update = () => {
			const searchTerm = this.keyword.toLowerCase().trim();
			const showOnlyPartners = this.partners;

			this.#cards.forEach(cardObj => {
				let isMatch = true;

				if (showOnlyPartners && !cardObj.isPartner) {
					isMatch = false;
				} else if (searchTerm) {
					isMatch = cardObj.searchableText.includes(searchTerm);
				}

				cardObj.element.hidden = !isMatch;
			});
		};

		if (useTransition && document.startViewTransition) {
			document.startViewTransition({ update, types: ['filter'] });
		} else {
			update();
		}
	}

	static {
		customElements.define('krv-bridge-partners', this);
	}
}

export { resources };
