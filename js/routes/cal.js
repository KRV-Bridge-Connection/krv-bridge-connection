import { GCalEvents } from '../components/g-cal.js';
import { html } from '@aegisjsproject/core/parsers/html.js';

const cName = '_' + crypto.randomUUID();
const sheet = new CSSStyleSheet();

sheet.replace(`.${cName} {
	aspect-ratio: unset;
	min-height: 80vh;
}`);

export default ({ params } ={}) => {
	if (typeof params?.cal === 'string') {
		const cal = GCalEvents.create(params?.cal);
		cal.classList.add(cName);
		return cal;
	} else {
		return html`<div>
			<p>Please Select a calendar to view.</p>
			<div class="flex row wrap space-evenly">
				<a href="/calendar/pantry" class="btn btn-link">Pantry</a>
				<a href="/calendar/partners" class="btn btn-link">Partner Schedule</a>
				<a href="/calendar/events" class="btn btn-link">KRV Bridge Connection Events</a>
			</div>
		</div>`;
	}
};

export const title = 'KRV Bridge Connection Calendar';

export const description = 'Calendar for Community Food Pantries, Partner Schedules, and Events.';

export const styles = [sheet];
