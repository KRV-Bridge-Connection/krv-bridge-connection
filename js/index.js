// import '@shgysk8zer0/kazoo/theme-cookie.js';
// import { getGooglePolicy } from '@shgysk8zer0/kazoo/trust-policies.js';
import { ready, toggleClass, css, on } from '@shgysk8zer0/kazoo/dom.js';
import { debounce } from '@shgysk8zer0/kazoo/events.js';
import { init } from '@shgysk8zer0/kazoo/data-handlers.js';
import { send } from '@shgysk8zer0/kazoo/slack.js';
// import { importGa, externalHandler, telHandler, mailtoHandler } from '@shgysk8zer0/kazoo/google-analytics.js';
// import { submitHandler } from './contact-demo.js';
// import { GA } from './consts.js';
import { navigate } from './functions.js';
import './components.js';
import './user.js';
import './admin.js';

if (! CSS.supports('height', '1dvh')) {
	css([document.documentElement], { '--viewport-height': `${window.innerHeight}px`});

	requestIdleCallback(() => {
		on([window], {
			resize: debounce(() => css([document.documentElement], { '--viewport-height': `${window.innerHeight}px`})),
		}, { passive: true });
	});
}

toggleClass([document.documentElement], {
	'no-dialog': document.createElement('dialog') instanceof HTMLUnknownElement,
	'no-details': document.createElement('details') instanceof HTMLUnknownElement,
	'js': true,
	'no-js': false,
});

// if (typeof GA === 'string' && GA.length !== 0) {
// 	scheduler.postTask(() => {
// 		importGa(GA, {}, { policy: getGooglePolicy() }).then(async ({ ga, hasGa }) => {
// 			if (hasGa()) {
// 				ga('create', GA, 'auto');
// 				ga('set', 'transport', 'beacon');
// 				ga('send', 'pageview');

// 				on('a[rel~="external"]', ['click'], externalHandler, { passive: true, capture: true });
// 				on('a[href^="tel:"]', ['click'], telHandler, { passive: true, capture: true });
// 				on('a[href^="mailto:"]', ['click'], mailtoHandler, { passive: true, capture: true });
// 			}
// 		});
// 	}, { priority: 'background' });
// }

Promise.all([
	customElements.whenDefined('install-prompt'),
	ready(),
]).then(([HTMLInstallPromptElement]) => {
	init();

	on('[data-navigate]', 'click', ({ currentTarget }) => navigate(currentTarget.dataset.navigate));

	// if (location.pathname.startsWith('/contact')) {
	// 	on('#contact-form', ['submit'], submitHandler);
	// }

	on('#install-btn', ['click'], () => new HTMLInstallPromptElement().show())
		.forEach(el => el.hidden = false);

	if (location.pathname.startsWith('/contact/')) {
		on('#contact-form', 'submit', async event => {
			event.preventDefault();
			const target = event.target;
			const data = new FormData(target);

			const HTMLNotification = customElements.get('html-notification');
			try {
				const resp = await send('/api/slack', {
					name: data.get('name'),
					email: data.get('email'),
					phone: data.get('telephone'),
					subject: data.get('subject'),
					body: data.get('body'),
				});

				console.log(resp);

				if (resp.success) {
					const notification = new HTMLNotification('Message Sent!', {
						body: 'Your message has been sent.',
						icon: '/img/icon-32.png',
						requireInteraction: true,
						actions: [
							{ title: 'Go to Home Page', action: 'home' },
							{ title: 'Dismiss', action: 'dismiss' },
						]
					});

					notification.addEventListener('notificationclick', event => {
						switch(event.action) {
							case 'dismiss':
								event.target.close();
								target.reset();
								break;

							case 'home':
								location.href = '/';
								break;
						}
					});

					target.reset();
				} else {
					throw new Error('Message not sent.');
				}
			} catch(err) {
				console.error(err);
				new HTMLNotification('Error Sending Message', {
					body: err.message,
				});
			}
		});
	}
});
