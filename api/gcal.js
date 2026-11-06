import { createHandler, HTTPBadGatewayError, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { url } from '@aegisjsproject/url';
import { openSecretStoreFile } from '@aegisjsproject/secret-store';
import { getSecretKey } from '@shgysk8zer0/aes-gcm';

/**
 * @typedef {Object} CalendarReminder
 * @property {"email" | "popup" | string} method
 * @property {number} minutes
 */

/**
 * @typedef {Object} CalendarEventDateTime
 * @property {string} [date] - All-day event date in "YYYY-MM-DD" format.
 * @property {string} [dateTime] - Timed event RFC3339 timestamp (e.g., "2026-10-26T10:00:00-07:00").
 * @property {string} [timeZone] - IANA time zone name (e.g., "America/Los_Angeles").
 */

/**
 * @typedef {Object} CalendarActor
 * @property {string} [id]
 * @property {string} [email]
 * @property {string} [displayName]
 * @property {boolean} [self]
 */

/**
 * @typedef {Object} CalendarAttendee
 * @property {string} [id]
 * @property {string} [email]
 * @property {string} [displayName]
 * @property {boolean} [organizer]
 * @property {boolean} [self]
 * @property {boolean} [resource]
 * @property {boolean} [optional]
 * @property {"needsAction" | "declined" | "tentative" | "accepted"} [responseStatus]
 * @property {string} [comment]
 * @property {number} [additionalGuests]
 */

/**
 * @typedef {Object} CalendarAttachment
 * @property {string} fileUrl
 * @property {string} title
 * @property {string} [mimeType]
 * @property {string} [iconLink]
 * @property {string} [fileId]
 */

/**
 * @typedef {Object} CalendarEvent
 * @property {"calendar#event"} kind
 * @property {string} etag
 * @property {string} id
 * @property {"confirmed" | "tentative" | "cancelled"} [status]
 * @property {string} [htmlLink]
 * @property {string} [created] - RFC3339 timestamp.
 * @property {string} [updated] - RFC3339 timestamp.
 * @property {string} [summary]
 * @property {string} [description]
 * @property {string} [location]
 * @property {string} [colorId]
 * @property {CalendarActor} [creator]
 * @property {CalendarActor} [organizer]
 * @property {CalendarEventDateTime} start
 * @property {CalendarEventDateTime} end
 * @property {boolean} [endTimeUnspecified]
 * @property {string[]} [recurrence] - Present on master recurring events; omitted when singleEvents=true.
 * @property {string} [recurringEventId] - Present on expanded recurring instances when singleEvents=true.
 * @property {CalendarEventDateTime} [originalStartTime] - Present on expanded recurring instances when singleEvents=true.
 * @property {"opaque" | "transparent"} [transparency]
 * @property {"default" | "public" | "private" | "confidential"} [visibility]
 * @property {string} [iCalUID]
 * @property {number} [sequence]
 * @property {CalendarAttendee[]} [attendees]
 * @property {boolean} [attendeesOmitted]
 * @property {{private?: Record<string, string>, shared?: Record<string, string>}} [extendedProperties]
 * @property {string} [hangoutLink]
 * @property {Object} [conferenceData]
 * @property {boolean} [anyoneCanAddSelf]
 * @property {boolean} [guestsCanInviteOthers]
 * @property {boolean} [guestsCanModify]
 * @property {boolean} [guestsCanSeeOtherGuests]
 * @property {boolean} [privateCopy]
 * @property {boolean} [locked]
 * @property {{useDefault: boolean, overrides?: CalendarReminder[]}} [reminders]
 * @property {{url: string, title: string}} [source]
 * @property {CalendarAttachment[]} [attachments]
 * @property {"default" | "outOfOffice" | "focusTime" | "workingLocation" | "fromGmail" | "birthday"} [eventType]
 */

/**
 * @typedef {Object} CalendarEventsResponse
 * @property {"calendar#events"} kind
 * @property {string} etag
 * @property {string} summary
 * @property {string} [description]
 * @property {string} updated - RFC3339 timestamp.
 * @property {string} timeZone - IANA time zone name.
 * @property {"none" | "freeBusyReader" | "reader" | "writer" | "owner"} accessRole
 * @property {CalendarReminder[]} defaultReminders
 * @property {string} [nextPageToken] - Present if more results are available; omitted on the final page.
 * @property {string} [nextSyncToken] - Present only on the final page when all results have been returned.
 * @property {CalendarEvent[]} items
 */

/**
 * @template T
 * @typedef {Omit<Response, 'json'> & { json(): Promise<T> }} TypedResponse
 */

const CALENDARS = {
	pantry: 'c_16733423f0da780704fd694ee47fbfbd2e7d0aaac0f076464b49e02794c4f412@group.calendar.google.com',
	partners: 'c_211fc8998c3d75914906fb365b905502aa1e534cf71764237fa7d00e2715c6f8@group.calendar.google.com',
	events: 'c_e793802b16d64a17e4e09e9cf6c048f7851a9abd8415e0c95be0f48b8c673581@group.calendar.google.com',
};

const getCalURL = ({ cal, key, timeMin, timeMax }) => cal in CALENDARS
	? url`https://www.googleapis.com/calendar/v3/calendars/${CALENDARS[cal.trim().toLowerCase()]}/events?key=${key.trim()}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`
	: null;

async function getCal(cal = 'pantry', { signal } = {}) {
	const key = await getSecretKey();
	const timeMin = new Date();
	timeMin.setHours(0, 0, 0, 0);
	const timeMax = new Date(timeMin.getFullYear(), timeMin.getMonth() + 1, timeMin.getDate(), 23, 59, 59, 999);
	const [secrets] = await openSecretStoreFile(key, '_data/secrets.json');
	const url = getCalURL({ cal, key: await secrets.GOOGLE_CALENDAR_API_KEY, timeMin, timeMax });

	if (url instanceof URL) {
		/**
		 * @type {TypedResponse<CalendarEventsResponse>}
		 */
		const resp = await fetch(url, { headers: { Accept: 'application/json' }, signal });

		if (resp.ok) {
			const { items , summary, description } = await resp.json();

			return Response.json({
				title: summary,
				description,
				events: items
					.filter(({ status }) => status === 'confirmed')
					.map(({ summary, description, start, end, endTimeUnspecified, location, htmlLink }) => ({
						summary,
						description,
						location,
						startDate: start.dateTime,
						endDate: end?.dateTime,
						endTimeUnspecified,
						url: htmlLink,
					}))
			});
		} else {
			throw new HTTPBadGatewayError(`${url.origin} [${resp.status}]`);
		}
	} else {
		throw new HTTPBadRequestError(`No calendar for "${cal}".`);
	}
}

export default createHandler({
	async get(req) {
		 if (req.searchParams.has('cal')) {
			return await getCal(req.searchParams.get('cal').trim().toLowerCase(), { signal: req.signal });
		} else {
			return await getCal('pantry', { signal: req.signal });
		}
	}
}, {
	allowOrigins: ['*'],
	logger: err => console.error(err),
});
