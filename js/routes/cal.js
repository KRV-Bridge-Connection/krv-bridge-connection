import { GCalEvents } from '../components/g-cal.js';

export default ({ params } ={}) => {
	const cal = GCalEvents.create(params?.cal);
	cal.classList.add('calendar');
	return cal;
};

export const title = 'KRV Bridge Connection Calendar';

export const description = 'Calendar for Community Food Pantries, Partner Schedules, and Events.';
