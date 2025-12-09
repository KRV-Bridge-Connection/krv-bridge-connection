import { registerCallback } from '@aegisjsproject/callback-registry/callbacks.js';
import { onClick, onChange, signal as signalAttr } from '@aegisjsproject/callback-registry/events.js';
import { attr } from '@aegisjsproject/core/stringify.js';

export const HOUSEHOLD_TEMPLATE_ID = 'household-member-template';
export const HOUSEHOLD_SIZE_ID = 'pantry-household-size';
export const HOUSEHOLD_CLASSNAME = 'household-member';
export const HOUSEHOLD_MEMBER_CLASSNAME = 'household-member-item';
export const HOUSEHOLD_LIST = 'pantry-household-list';
export const ADD_HOUSEHOLD_MEMBER_ID = 'pantry-add-household-member-btn';

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

export const pantryHouseholdSizeChange = registerCallback('pantry:household_size:change', ({ currentTarget }) => {
	if (currentTarget.validity.valid) {
		/**
		 * @type {HTMLFormElement}
		 */
		const form = currentTarget.form;
		const rest = Array.from(
			form.querySelectorAll(`[name="${currentTarget.name}"]`),
			el => el.isSameNode(currentTarget) ? null : el.value.toLowerCase(),
		);

		if (rest.includes(currentTarget.value.toLowerCase())) {
			currentTarget.setCustomValidity('Each household member must be unique.');
		} else {
			currentTarget.setCustomValidity('');
		}
	}
});

export const getHouseholdSize = household => `<input type="number" name="household" id="${HOUSEHOLD_SIZE_ID}" class="input" placeholder="##" min="1" max="8" inputmode="numeric" autocomplete="off" ${attr({ value: household })} required="" />`;

export const getPantryHouseholdTemplate = ({ signal }) => `<template id="${HOUSEHOLD_TEMPLATE_ID}">
	<li class="flex row ${HOUSEHOLD_MEMBER_CLASSNAME}">
		<input name="person[]" required="" class="household-member input" minlength="3" ${onChange}="${pantryHouseholdSizeChange}" ${signalAttr}="${signal}">
		<button type="button" class="btn btn-danger" title="Remove Household Member" aria-label="Remove Household Member" ${onClick}="${pantryRemoveHousehold}" ${signalAttr}="${signal}">
			<svg fill="currentColor" height="16" width="16" role="presentation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 16">
				<path fill-rule="evenodd" d="M11 2H9c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1H2c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1v9c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 12H3V5h1v8h1V5h1v8h1V5h1v8h1V5h1v9zm1-10H2V3h9v1z"></path>
			</svg>
		</button>
	</li>
</template>`;

export const addHouseholdMember = () => document.getElementById(ADD_HOUSEHOLD_MEMBER_ID).click();

export const getHouseholdSizeValue = () => document.getElementById(HOUSEHOLD_SIZE_ID).valueAsNumber;

export const isCorrectHouseholdSize = formData => formData.getAll('person[]').length === getHouseholdSizeValue() - 1;
