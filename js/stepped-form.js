import { on } from '@shgysk8zer0/kazoo/dom.js';
import { createImage } from '@shgysk8zer0/kazoo/elements.js';

on('.multi-step-form [data-nav]', 'click', ({ currentTarget }) => {
	const section = currentTarget.closest('.form-section');

	if (currentTarget.dataset.nav === 'next') {
		section.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
	} else if (currentTarget.dataset.nav === 'prev') {
		section.previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'start' });
	}
});

on('#org-logo', 'change', ({ target }) => {
	if (target.files.length === 1) {
		const file = target.files[0];
		const img = new Image(96, 96);
		const container = target.form.querySelector('.logo-container');
		const current = container.querySelector('.logo-preview');
		img.src = URL.createObjectURL(file);
		img.classList.add('logo-preview');

		if (current instanceof HTMLElement) {
			URL.revokeObjectURL(current.src);
			current.replaceWith(img);
		} else {
			container.replaceChildren(img);
		}
	}
});
