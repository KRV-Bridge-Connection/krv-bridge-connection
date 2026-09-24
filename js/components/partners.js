import data from 'https://krvbridge.org/partners.json' with { type: 'json' };

const resources = data.partners;
const sheet = new CSSStyleSheet();

sheet.replaceSync(`
	:host {
		display: block;
		font-family: system-ui, sans-serif;

		&([theme='dark']) {
			color-scheme: dark;
		}

		&([theme='light']) {
			color-scheme: light;
		}
	}

	.wrapper {
		background-color: light-dark(#ffffff, #121212);
		color: light-dark(#111111, #eeeeee);
		padding: 1rem;
		border-radius: 8px;

		& .search-bar {
			display: flex;
			gap: 0.5rem;
			margin-bottom: 1.5rem;

			& input[type='search'] {
				flex: 1;
				padding: 0.5rem 1rem;
				border: 1px solid light-dark(#cccccc, #444444);
				background-color: light-dark(#ffffff, #2a2a2a);
				color: light-dark(#111111, #eeeeee);
				border-radius: 4px;
				font-size: 1rem;
			}

			& button {
				padding: 0.5rem 1rem;
				border: 1px solid light-dark(#cccccc, #444444);
				background-color: light-dark(#f0f0f0, #333333);
				color: light-dark(#111111, #eeeeee);
				border-radius: 4px;
				cursor: pointer;
				font-size: 1rem;

				&:hover {
					background-color: light-dark(#e0e0e0, #444444);
				}
			}
		}

		& .list {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: 1rem;
		}

		& .card {
			padding: 1.2rem;
			border: 1px solid light-dark(#e0e0e0, #333333);
			border-radius: 6px;
			background-color: light-dark(#fafafa, #1e1e1e);
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			&[hidden] {
				display: none !important;
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
				color: light-dark(#0056b3, #66b3ff);
			}

			& p {
				margin: 0;
				font-size: 0.9rem;
				line-height: 1.4;
				color: light-dark(#444444, #cccccc);
			}

			& .meta {
				font-size: 0.85rem;
				color: light-dark(#666666, #aaaaaa);
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
					background-color: light-dark(#e9ecef, #333333);
					border-radius: 12px;
					color: light-dark(#333333, #dddddd);
					cursor: pointer;
					transition: background-color 0.2s ease;

					&:hover {
						background-color: light-dark(#d0d4d8, #555555);
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
`);

export class KRVBridgePartners extends HTMLElement {
	#shadow = this.attachShadow({ mode: 'closed' });
	// #internals = this.attachInternals();
	#isInitialized = false;
	#listContainer;
	#searchInput;
	#cards = [];

	constructor() {
		super();
		this.#shadow.adoptedStyleSheets = [sheet];

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
		if (val) {
			this.setAttribute('partners', '');
		} else {
			this.removeAttribute('partners');
		}
	}

	get keyword() {
		return this.getAttribute('keyword') || '';
	}

	set keyword(val) {
		if (val) {
			this.setAttribute('keyword', val);
		} else {
			this.removeAttribute('keyword');
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			if (name === 'keyword' && this.#searchInput) {
				this.#searchInput.value = newValue || '';
			}
			if (this.#isInitialized) {
				this.#filterCards(true);
			}
		}
	}

	#renderLayout() {
		const wrapper = document.createElement('div');
		wrapper.className = 'wrapper';
		wrapper.part.add('wrapper');

		const searchBar = document.createElement('form');
		searchBar.className = 'search-bar';
		searchBar.part.add('search-bar');
		searchBar.addEventListener('submit', (e) => {
			e.preventDefault();
			this.keyword = this.#searchInput.value;
		});

		this.#searchInput = document.createElement('input');
		this.#searchInput.type = 'search';
		this.#searchInput.placeholder = 'Search by keyword or name...';
		this.#searchInput.value = this.keyword;
		this.#searchInput.setAttribute('list', 'keyword-suggestions');
		this.#searchInput.part.add('search-input');

		const datalist = document.createElement('datalist');
		datalist.id = 'keyword-suggestions';

		const uniqueKeywords = new Set();
		if (data.partners) {
			data.partners.forEach(item => {
				if (item.keywords) {
					item.keywords.forEach(kw => uniqueKeywords.add(kw));
				}
			});
		}

		Array.from(uniqueKeywords).sort().forEach(kw => {
			const option = document.createElement('option');
			option.value = kw;
			datalist.append(option);
		});

		const submitBtn = document.createElement('button');
		submitBtn.type = 'submit';
		submitBtn.textContent = 'Search';
		submitBtn.part.add('submit-button');

		const clearBtn = document.createElement('button');
		clearBtn.type = 'button';
		clearBtn.textContent = 'Clear';
		clearBtn.part.add('clear-button');
		clearBtn.addEventListener('click', () => {
			this.#searchInput.value = '';
			this.keyword = '';
		});

		searchBar.append(this.#searchInput, datalist, submitBtn, clearBtn);

		this.#listContainer = document.createElement('div');
		this.#listContainer.className = 'list';
		this.#listContainer.part.add('list');

		wrapper.append(searchBar, this.#listContainer);
		this.#shadow.append(wrapper);
	}

	#buildCards() {
		const partnersData = data.partners || [];

		partnersData.forEach(item => {
			const card = document.createElement('div');
			card.className = 'card';
			card.part.add('card');

			if (item.image && (item.image.src || item.image.url)) {
				const img = document.createElement('img');
				const rawSrc = item.image.src || item.image.url;

				img.src = new URL(rawSrc, 'https://krvbridge.org').href;
				img.alt = `${item.name} logo`;
				img.className = 'card-logo';
				img.loading = 'lazy';
				img.part.add('card-logo');

				if (item.image.width) img.setAttribute('width', item.image.width);
				if (item.image.height) img.setAttribute('height', item.image.height);

				card.append(img);
			}

			const title = document.createElement('h3');
			title.part.add('card-title');
			if (item.url) {
				const link = document.createElement('a');
				link.href = item.url;
				link.target = '_blank';
				link.textContent = item.name;
				link.part.add('card-link');
				title.append(link);
			} else {
				title.textContent = item.name;
			}

			const desc = document.createElement('p');
			desc.textContent = item.description || '';
			desc.part.add('card-description');

			card.append(title, desc);

			if (item.telephone || item.email) {
				const meta = document.createElement('div');
				meta.className = 'meta';
				meta.part.add('card-meta');

				if (item.telephone) {
					const phoneSpan = document.createElement('span');
					phoneSpan.textContent = 'Phone: ';
					phoneSpan.part.add('phone-label');

					const phoneLink = document.createElement('a');
					phoneLink.href = `tel:${item.telephone.replace(/\s+/g, '')}`;
					phoneLink.textContent = item.telephone;
					phoneLink.part.add('phone-link');

					phoneSpan.append(phoneLink);
					meta.append(phoneSpan);
				}

				if (item.telephone && item.email) {
					const separator = document.createElement('span');
					separator.textContent = ' | ';
					separator.part.add('meta-separator');
					meta.append(separator);
				}

				if (item.email) {
					const emailSpan = document.createElement('span');
					emailSpan.textContent = 'Email: ';
					emailSpan.part.add('email-label');

					const emailLink = document.createElement('a');
					emailLink.href = `mailto:${item.email.trim()}`;
					emailLink.textContent = item.email;
					emailLink.part.add('email-link');

					emailSpan.append(emailLink);
					meta.append(emailSpan);
				}

				card.append(meta);
			}

			if (item.keywords && item.keywords.length > 0) {
				const tags = document.createElement('div');
				tags.className = 'tags';
				tags.part.add('tags');
				item.keywords.forEach(kw => {
					const tag = document.createElement('span');
					tag.className = 'tag';
					tag.textContent = kw;
					tag.part.add('tag');
					tag.addEventListener('click', () => {
						this.keyword = kw;
					});
					tags.append(tag);
				});
				card.append(tags);
			}

			this.#listContainer.append(card);

			const nameMatch = item.name?.toLowerCase() || '';
			const descMatch = item.description?.toLowerCase() || '';
			const keywordMatch = item.keywords?.map(k => k.toLowerCase()).join(' ') || '';
			const searchableText = `${nameMatch} ${descMatch} ${keywordMatch}`;

			this.#cards.push({
				element: card,
				isPartner: item.partner === true,
				searchableText: searchableText
			});
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
