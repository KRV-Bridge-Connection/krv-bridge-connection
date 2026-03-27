import { createHandler, HTTPBadGatewayError } from '@shgysk8zer0/lambda-http';
import { url } from '@aegisjsproject/url/parser.js';
import { openSecretStoreFile } from '@aegisjsproject/secret-store';
import { getSecretKey } from '@shgysk8zer0/aes-gcm';

const CALENDARS = {
	pantry: 'c_16733423f0da780704fd694ee47fbfbd2e7d0aaac0f076464b49e02794c4f412@group.calendar.google.com',
};

const getCalURL = (cal, key) => cal in CALENDARS ? url`https://www.googleapis.com/calendar/v3/calendars/${CALENDARS[cal]}/events?key=${key}` : null;

async function getCal(cal = 'pantry', { signal } = {}) {
	const key = await getSecretKey();
	const [secrets] = await openSecretStoreFile(key, '_data/secrets.json');
	const url = getCalURL(cal?.toLowerCase(), await secrets.GOOGLE_CALENDAR_API_KEY);

	if (url instanceof URL) {
		const resp = await fetch(url, { headers: { Accept: 'application/json', signal }});

		if (resp.ok) {
			const { items , summary, description } = await resp.json();

			return { title: summary, description, events: items
				.filter(({ status }) => status === 'confirmed')
				.map(({ summary, description, start, end, location, htmlLink }) => ({
					summary,
					description,
					location,
					startDate: start.dateTime,
					endDate: end.dateTime,
					url: htmlLink,
				})) };
		} else {
			throw new DOMException(`No calendar for ${cal}.`, 'NetworkError');
		}
	}
}

export default createHandler({
	async get(req) {
		try {
			if (req.searchParams.has('cal')) {
				return await getCal(req.searchParams.get('cal').trim().toLowerCase(), { signal: req.signal });
			} else {
				return await getCal('pantry', { signal: req.signal });
			}
		} catch(err) {
			throw new HTTPBadGatewayError('Error requesting calendar', { cause: err });
		}
	}
}, {
	allowOrigins: ['*'],
});
