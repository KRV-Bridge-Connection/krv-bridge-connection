import { IotaElement } from '@aegisjsproject/iota/iota-element.js';
import { url } from '@aegisjsproject/url';


const fmt = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'medium', timeStyle: 'short' });

function createEventItem({ summary, description, location, startDate, endDate, url }) {
	const li = document.createElement('li');
	li.part = 'event';

	const a = document.createElement('a');
	a.part = 'event-link';
	a.href = url;
	a.rel = 'noopener noreferrer';
	a.target = '_blank';
	a.textContent = summary ?? 'Untitled';
	li.append(a);

	if (description) {
		const p = document.createElement('p');
		p.part = 'event-description';
		p.textContent = description;
		li.append(p);
	}

	const timeWrap = document.createElement('p');
	timeWrap.part = 'event-times';

	const start = document.createElement('time');
	start.part = 'event-start';
	start.dateTime = startDate ?? '';
	start.textContent = startDate ? fmt.format(new Date(startDate)) : 'All day';
	timeWrap.append(start);

	if (endDate) {
		timeWrap.append(' – ');
		const end = document.createElement('time');
		end.part = 'event-end';
		end.dateTime = endDate;
		end.textContent = new Date(endDate).toLocaleTimeString(navigator.language, { hour: '2-digit', minute: '2-digit' });
		timeWrap.append(end);
	}

	li.append(timeWrap);

	if (location) {
		const addr = document.createElement('address');
		addr.part = 'event-location';
		addr.textContent = location;
		li.append(addr);
	}

	return li;
}

export class GCalEvents extends IotaElement {
	static observedAttributes = ['cal'];
	static shadowRootSlotAssignment = 'manual';

	#activeCal = null;

	get html() {
		return `
			<h2 part="title" id="cal-title"></h2>
			<p part="description" id="cal-desc" hidden></p>
			<ul part="events" id="events" role="list"></ul>
			<p part="status" id="status" role="status" hidden></p>
		`;
	}

	get styles() {
		return `:host {
			display: block;
			font-family: system-ui, sans-serif;
			color-scheme: light dark;
		}

		:host(:state(loading)) [part="events"] {
			opacity: 0.5;
			pointer-events: none;
		}

		:host(:state(error)) [part="status"] {
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
			background: light-dark(#f5f7ff, #1a1d2e);
			border-radius: 0 4px 4px 0;
			display: grid;
			gap: 0.25em;
		}

		[part="event-link"] {
			font-weight: 600;
			color: light-dark(royalblue, cornflowerblue);
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
		if (type !== 'attributeChanged') return;

		const cal = this.getAttribute('cal')?.trim().toLowerCase();

		if (! cal || cal === this.#activeCal) return;

		this.#activeCal = cal;
		internals.states.add('loading');
		internals.states.delete('error');
		internals.states.delete('empty');


		try {
			const resp = await fetch(url`${location.origin}/api/gcal?cal=${cal}`, { signal });

			if (signal.aborted) return;

			if (! resp.ok) throw new Error(`${resp.status}`);
			const status = shadow.getElementById('status');
			status.hidden = false;
			status.textContent = 'Loading events…';

			const { title, description, events } = await resp.json();

			shadow.getElementById('cal-title').textContent = title ?? '';

			const descEl = shadow.getElementById('cal-desc');
			if (description) {
				descEl.textContent = description;
				descEl.hidden = false;
			} else {
				descEl.hidden = true;
			}

			const list = shadow.getElementById('events');
			list.replaceChildren(...events.map(createEventItem));

			status.hidden = true;
			internals.states.delete('loading');

			if (events.length === 0) {
				status.textContent = 'No upcoming events.';
				status.hidden = false;
				internals.states.add('empty');
			}
		} catch(err) {
			if (signal.aborted) return;
			internals.states.delete('loading');
			internals.states.add('error');
			status.textContent = 'Failed to load events.';
			this.dispatchEvent(new ErrorEvent('error', { message: err.message, error: err }));
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
