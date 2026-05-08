/**
 * @typedef EventData
 * @property {string} label
 * @property {URL} url
 * @property {Date} timestamp
 * @property {string|undefined} notes
 */
export class Anayltics {
	/** @type {FormData} */
	#data = new FormData();

	/** @type {URL} */
	#endpoint;

	constructor(endpoint) {
		if (endpoint instanceof URL) {
			this.#endpoint = endpoint;
		} else if (URL.canParse(endpoint)) {
			this.#endpoint = new URL(endpoint);
		} else {
			throw new TypeError('Endpoint must be a valid URL.');
		}
	}

	/**
	 *
	 * @param {EventData} event
	 */
	logEvent({ label, url = new URL(location.pathname, location.origin), timestamp = new Date(), notes }) {
		if (typeof label !== 'string' || label.length === 0) {
			throw new TypeError(`Label must be a non-empty string. Got a ${typeof label}.`);
		} else if (! (timestamp instanceof Date)) {
			throw new TypeError('Timestamp must be a date.');
		} else if (! (url instanceof URL)) {
			throw new TypeError('Data `url` must be a valid URL object.');
		} else if (typeof notes !== 'string' && typeof notes !== 'undefined') {
			throw new TypeError('Notes must be a string or undefiend.');
		} else {
			this.#data.append('label[]', label);
			this.#data.append('url[]', url.href);
			this.#data.append('timestamp[]', timestamp.getTime());
			this.#data.append('notes[]', notes);
		}
	}

	send() {
		const result = navigator.sendBeacon(this.#endpoint, this.#data);
		this.#data = new FormData();
		return result;
	}
}
