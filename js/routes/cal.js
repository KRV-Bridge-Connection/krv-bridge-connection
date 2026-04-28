import { GCalEvents } from '../components/g-cal.js';

const cName = '_' + crypto.randomUUID();
const sheet = new CSSStyleSheet();

sheet.replace(`.${cName} {
	aspect-ratio: unset;
	min-height: 80vh;
}`);

export default ({ params } ={}) => {
	const cal = GCalEvents.create(params?.cal);
	cal.classList.add(cName);
	return cal;
};

export const title = 'KRV Bridge Connection Calendar';

export const description = 'Calendar for Community Food Pantries, Partner Schedules, and Events.';

export const styles = [sheet];
