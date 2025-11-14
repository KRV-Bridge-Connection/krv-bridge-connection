
import { createGoogleCalendar } from '@shgysk8zer0/kazoo/google/calendar.js';

const CAL = 'Y18xNjczMzQyM2YwZGE3ODA3MDRmZDY5NGVlNDdmYmZiZDJlN2QwYWFhYzBmMDc2NDY0YjQ5ZTAyNzk0YzRmNDEyQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20';

export const title = 'KRV Food Distribution Calendar';

export const description = 'Calendar of Food Distributions in the Kern River Valley';

export default () => createGoogleCalendar(CAL, {
	credentialless: true,
	title,
	showPrint: true,
	classList: ['full-width'],
});
