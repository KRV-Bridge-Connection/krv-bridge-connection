import { on } from '@shgysk8zer0/kazoo/dom.js';
import './stepped-form.js';

on('#org-category', 'change', ({ target }) => {
	const form = target.form;
	const index = target.selectedIndex;
	const option = target.options.item(index);

	if (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.label.length !== 0) {
		form.querySelector('[name="category"]').value = option.parentElement.label;
	}
});

on('#org-profile-hours .hours-open, #org-profile-hours .hours-close', 'change', ({ target }) => {
	const group = target.closest('.form-group');
	const pair = target.classList.contains('hours-open')
		? group.querySelector('.hours-close')
		: group.querySelector('.hours-open');

	console.log({ target, group, pair });

	if (target.value === '') {
		pair.required = false;
	} else if (target.classList.contains('hours-open')) {
		pair.required = true;
		pair.min = target.value;
	} else if (target.classList.contains('hours-close')) {
		pair.required = true;
		pair.max = target.value;
	} else {
		throw new DOMException('Missing class to match open and close hours');
	}
});

on('input[data-origin]', 'change', ({ target }) => {
	if (target.value.length === 0) {
		target.setCustomValidity(target.required ? 'A valid URL is required' : '');
	} else if (! URL.canParse(target.value)) {
		target.setCustomValidity('Invalid URL');
	} else if (new URL(target.value).origin !== target.dataset.origin) {
		target.setCustomValidity(`URL must begin with ${target.dataset.origin}`);
	} else {
		target.setCustomValidity('');
	}
});

on('[data-copy-hours]', 'click', ({ currentTarget }) => {
	const group = currentTarget.closest(`.${currentTarget.dataset.copyHours}`);
	const open = group.querySelector('.hours-open').value;
	const close = group.querySelector('.hours-close').value;

	currentTarget.form.querySelectorAll(`.${currentTarget.dataset.copyHours}`).forEach(section => {
		if (! group.isSameNode(section)) {
			section.querySelector('.hours-open').value = open;
			section.querySelector('.hours-close').value = close;
		}
	});
});

on('#org-profile-form', 'submit', async event => {
	event.preventDefault();

	const data = new FormData(event.target);

	if (data.get('@identifier').length === 0) {
		data.set('@identifier', crypto.randomUUID());
	}

	console.log(data);
});
