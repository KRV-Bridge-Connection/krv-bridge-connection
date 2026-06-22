const sheet = new CSSStyleSheet();

const PROP_PREFIX = '_context-menu';

if (typeof CSS.registerProperty === 'function') {
	CSS.registerProperty({
		name: `--${PROP_PREFIX}-top`,
		syntax: '<length>',
		inherits: false,
		initialValue: '0px',
	});

	CSS.registerProperty({
		name: `--${PROP_PREFIX}-left`,
		syntax: '<length>',
		inherits: false,
		initialValue: '0px',
	});
}

sheet.replaceSync(`@layer components.context-menu {
	:host {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		border-radius: 8px;
		box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
		padding: 4px 0;
		min-width: 160px;
		font-family: system-ui, sans-serif;
		font-size: 14px;
		color: #0f172a;
		margin: 0;
		position: fixed;
		inset: auto;
		top: var(--${PROP_PREFIX}-top);
		left: var(--${PROP_PREFIX}-left);
	}

	:host(:popover-open) {
		display: flex;
		flex-direction: column;
	}

	::slotted(*) {
		display: block;
		width: 100%;
		text-align: left;
		background: transparent;
		border: none;
		padding: 8px 16px;
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-decoration: none;
		box-sizing: border-box;
	}

	::slotted(:hover), ::slotted(:focus-visible) {
		background-color: #f1f5f9;
		outline: none;
	}
}`);


class HTMLContextMenuElement extends HTMLElement {
	#shadow = this.attachShadow({ mode: 'closed' });
	#internals = this.attachInternals();
	#slot = document.createElement('slot');
	#controller;

	constructor() {
		super();
		this.#shadow.append(this.#slot);
		this.#shadow.adoptedStyleSheets = [sheet];
		this.#internals.role = 'menu';
	}

	connectedCallback() {
		this.#controller = new AbortController();

		if (! this.hasAttribute('popover')) {
			this.popover = 'auto';
		}

		document.addEventListener('contextmenu', this.#handler.bind(this), { signal: this.#controller.signal });

		this.#slot.addEventListener('slotchange', ({ target }) => {
			target.assignedElements().forEach(el => {
				if (! el.hasAttribute('role')) {
					el.setAttribute('role', 'menuitem');
				}
			});
		}, { signal: this.#controller.signal });
	}

	disconnectedCallback() {
		this.#controller.abort();
	}

	[Symbol.dispose]() {
		if (this.matches(':popover-open')) {
			this.hidePopover();
		}

		this.remove();
	}

	get target() {
		return document.body;
	}

	#handler(event) {
		event.preventDefault();
		event.stopPropagation();
		const { clientX, clientY } = event;
		const controller = new AbortController();
		const signal = AbortSignal.any([this.#controller.signal, controller.signal ]);

		this.addEventListener('beforetoggle', ({ newState }) => {
			if (newState === 'open') {
				this.style.setProperty(`--${PROP_PREFIX}-top`, `${clientY}px`);
				this.style.setProperty(`--${PROP_PREFIX}-left`, `${clientX}px`);

				this.addEventListener('toggle', ({ newState }) => {
					if (newState === 'open') {
						requestAnimationFrame(() => controller.abort());
					}
				}, { signal });

				document.addEventListener('click', e => e.preventDefault(), { signal });
				document.addEventListener('pointerdown', e => e.preventDefault(), { signal });
				document.addEventListener('contextmenu', e => e.preventDefault(), { signal });
			}
		}, { signal, passive: true });

		requestAnimationFrame(() => this.showPopover());
	}

	static create(menuItems) {
		const menu = new this();

		if (Array.isArray(menuItems)) {
			menu.append(...menuItems.map(({ label, command, commandForElement = document.documentElement }) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.role = 'menuitem';
				button.textContent = label;
				button.command = command;
				button.commandForElement = commandForElement;
				return button;
			}));
		}
		return menu;
	}
}

customElements.define('context-menu', HTMLContextMenuElement);
