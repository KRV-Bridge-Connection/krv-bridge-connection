import { on } from '@shgysk8zer0/kazoo/dom.js';

on('.multi-step-form [data-nav]', 'click', ({ currentTarget }) => {
	const section = currentTarget.closest('.form-section');
	const tabs = section.form.querySelectorAll('[role="tab"]');

	if (currentTarget.dataset.nav === 'next') {
		const next = section.nextElementSibling;
		tabs.forEach(tab => tab.setAttribute('aria-selected', tab.getAttribute('aria-controls') === next.id ? 'true' : 'false'));
		next.scrollIntoView({ behavior: 'smooth', inline: 'start' });
	} else if (currentTarget.dataset.nav === 'prev') {
		const prev = section.previousElementSibling;
		tabs.forEach(tab => tab.setAttribute('aria-selected', tab.getAttribute('aria-controls') === prev.id ? 'true' : 'false'));
		prev.scrollIntoView({ behavior: 'smooth', inline: 'start' });
	}
});

on('.tablist[role="tablist"] .btn.tab[role="tab"][aria-controls]', 'click', ({ currentTarget }) => {
	currentTarget.closest('.tablist').querySelectorAll('.tab')
		.forEach(tab => tab.setAttribute('aria-selected', currentTarget.isSameNode(tab) ? 'true' : 'false'));

	document.getElementById(currentTarget.getAttribute('aria-controls')).scrollIntoView({ behavior: 'smooth', inline: 'start' });
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
