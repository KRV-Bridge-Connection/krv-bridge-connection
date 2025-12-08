import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';

export const HOUSEHOLD_TEMPLATE_ID = 'household-member-template';
export const HOUSEHOLD_CLASSNAME = 'household-member';
export const HOUSEHOLD_MEMBER_CLASSNAME = 'household-member-item';
export const HOUSEHOLD_LIST = 'pantry-household-list';

export const getPantryHouseholdTemplate = ({ signal }) => `<template id="${HOUSEHOLD_TEMPLATE_ID}">
	<li class="flex row ${HOUSEHOLD_MEMBER_CLASSNAME}">
		<input name="person[]" required="" class="household-member input" minlength="3">
		<button type="button" class="btn btn-danger" title="Remove Household Member" aria-label="Remove Household Member" ${onClick}="${pantryRemoveHousehold}" ${signalAttr}="${signal}">
			<svg fill="currentColor" height="16" width="16" role="presentation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 16">
				<path fill-rule="evenodd" d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"></path>
			</svg>
		</button>
	</li>
</template>`;

export const pantryAddHousehold = registerCallback('pantry:household:add', () => {
	/**
	 * @type {HTMLInputElement[]}
	 */
	const members = Array.from(document.querySelectorAll('.' + HOUSEHOLD_CLASSNAME));

	if (members.every(member => member.validity.valid)) {
		const list = document.getElementById(HOUSEHOLD_LIST);
		const tmp = document.getElementById(HOUSEHOLD_TEMPLATE_ID).content.cloneNode(true);
		const input = tmp.querySelector('input');
		list.append(tmp);
		requestAnimationFrame(() => input.focus());
	}
});

export const pantryRemoveHousehold = registerCallback('pantry:household:remove', ({ currentTarget }) => currentTarget.closest('li').remove());
