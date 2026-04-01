import { GCalEvents } from '../components/g-cal.js';

export default ({ params } ={}) => GCalEvents.create(params?.cal);

export const title = 'KRV Bridge Connection Calendar';

export const description = 'Calendar for Community Food Pantries, Partner Schedules, and Events.';
