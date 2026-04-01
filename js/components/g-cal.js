import { IotaElement, $text, $hidden, $state, $watch, $html } from '@aegisjsproject/iota';
import { url } from '@aegisjsproject/url';
import { escapeHTML } from '@aegisjsproject/escape';
import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';

const START_FORMAT = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
const END_FORMAT = { hour: '2-digit', minute: '2-digit' };

export class GCalEvents extends IotaElement {
	static observedAttributes = ['cal'];
	static shadowRootSlotAssignment = 'manual';

	#summary = this.use($text('Untitled Calendar'));
	#desc = this.use($text(''));
	#descHidden = this.use($hidden(() => this.#desc.get()?.toString?.().length === 0));
	#status = this.use($text('No Calendar Specified'));
	#statusHidden = this.use($hidden(() => this.#status.get()?.toString?.().length === 0));
	#events = this.use($state([]));
	#activeCal = null;

	get html() {
		return $html`
			<h2 part="title" id="cal-title">${this.#summary}</h2>
			<p part="description" id="cal-desc" ${this.#descHidden}>${this.#desc}</p>
			<ul part="events" id="events" role="list"></ul>
			<p part="status" id="status" role="status" ${this.#statusHidden}>${this.#status}</p>
		`;
	}

	get styles() {
		return css`:host {
			display: block;
			font-family: system-ui, sans-serif;
			color-scheme: light dark;
		}

		:host(:state(loading)) [part="events"] {
			opacity: 0.5;
			pointer-events: none;
		}

		:host(:state(error)) [part="status"] {
			color: salmon;
			color: light-dark(crimson, salmon);
		}

		[part="title"] {
			margin: 0 0 0.25em;
			font-size: 1.25em;
		}

		[part="description"] {
			margin: 0 0 1em;
			opacity: 0.7;
			font-size: 0.9em;
		}

		[part="events"] {
			list-style: none;
			margin: 0;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.75em;
		}

		[part="event"] {
			padding: 0.75em 1em;
			border-inline-start: 3px solid light-dark(royalblue, cornflowerblue);
			background-color: light-dark(#f5f7ff, #1a1d2e);
			border-radius: 0 4px 4px 0;
			display: grid;
			gap: 0.25em;
		}

		[part="event-link"] {
			font-weight: 600;
			color: LinkText;
			text-decoration: none;

			&:hover {
				text-decoration: underline;
			}
		}

		[part="event-times"] {
			margin: 0;
			font-size: 0.85em;
			opacity: 0.8;
		}

		[part="event-location"] {
			font-size: 0.85em;
			font-style: normal;
			opacity: 0.7;

			&::before {
				content: '📍 ';
			}
		}

		[part="event-description"] {
			margin: 0;
			font-size: 0.85em;
			opacity: 0.7;
		}

		[part="status"] {
			font-size: 0.9em;
			opacity: 0.7;
		}`;
	}

	async update(type, { signal, shadow, internals }) {
		switch(type) {
			case 'connected':
				$watch(this.#events, events => {
					if (events.length === 0) {
						this.#status.set('No upcoming events.');
						internals.states.add('empty');
					} else {
						const list = shadow.getElementById('events');
						internals.states.delete('empty');
						this.#status.set('');

						list.replaceChildren(html`${events.map(({ summary = 'Untitled', description, location, startDate, endDate, url }) => {
							const startTime = new Date(startDate);
							const endTime = typeof endDate === 'string' ? new Date(endDate) : null;

							return `<li part="event">
								<a href="${url}" part="event-link" target="gCal" rel="noopener noreferrer external">${escapeHTML(summary)}</a>
								${typeof description === 'string' ? `<p part="event-description">${escapeHTML(description)}</p>` : ''}
								<p part="event-times">
									<time datetime="${startTime.toISOString()}" part="event-start">${startTime.toLocaleString(navigator.language, START_FORMAT)}</time>
									${endTime instanceof Date ? `<span>&mdash;</span><time datetime="${endTime.toISOString()}" part="event-end">${endTime.toLocaleTimeString(navigator.language, END_FORMAT)}</time>` : ''}
								</p>
								${typeof location === 'string' ? `<address part="event-location">${escapeHTML(location)}</address>` : ''}
							</li>`;
						}).join('')}`);
					}
				});
				break;

			case 'attributeChanged':
				await this.#updateCalendar({ signal, internals });
				break;
		}
	}

	async #updateCalendar({ signal, internals } = {}) {
		const cal = this.cal;

		if (typeof cal === 'string' && cal !== this.#activeCal) {
			this.#activeCal = cal;
			internals.states.add('loading');
			internals.states.delete('error');
			internals.states.delete('empty');
			this.#status.set('Loading Events…');

			try {
				const { title, description = '', events } = await this.#getCalendar({ signal });
				this.#summary.set(title);
				this.#desc.set(description);
				this.#events.set(events);
				this.#status.set(events.length === 0 ? 'No events to display' : '');
			} catch(err) {
				internals.states.add('error');
				this.#status.set('Failed to load events.');
				this.#desc.set('');
				this.dispatchEvent(new ErrorEvent('error', { message: err.message, error: err }));
			} finally {
				internals.states.delete('loading');
			}
		}
	}

	async #getCalendar({ signal } = {}) {
		const resp = await fetch(url`${location.origin}/api/gcal?cal=${this.cal}`, {
			headers: { Accept: 'application/json' },
			signal,
		});

		if (! resp.ok) {
			throw new DOMException(`${resp.url} [${resp.status}]`, 'NetworkError');
		} else {
			return await resp.json();
		}
	}

	get cal() {
		return this.getAttribute('cal');
	}

	set cal(val) {
		this.setAttribute('cal', val);
	}

	static create(cal) {
		const el = new this();
		el.cal = cal;
		return el;
	}

	static {
		this.register('g-cal-events');
	}
}
