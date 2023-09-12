import { on, each } from '@shgysk8zer0/kazoo/dom.js';
import { resizeImageFile } from '@shgysk8zer0/kazoo/img-utils.js';
import { PNG } from '@shgysk8zer0/kazoo/types.js';
import { alert } from '@shgysk8zer0/kazoo/asyncDialog.js';
import { registerSignOutButton, disableOnSignOut, disableOnSignIn } from '@shgysk8zer0/components/firebase/auth/auth.js';
import { createOrUpdateDoc } from './firebase/firestore.js';
import { uploadFile, getDownloadURL } from './firebase/storage.js';
import { getCurrentUser } from './firebase/auth.js';
import { navigate } from './functions.js';
import './stepped-form.js';

async function signIn() {
	const user = await getCurrentUser();

	if (typeof user === 'object' && ! Object.is(user, null)) {
		return user;
	} else {
		const HTMLFirebaseSignInElement = await customElements.whenDefined('firebase-sign-in');
		return await HTMLFirebaseSignInElement.asDialog();
	}
}

const FIREBASE_FORMS = 'firebase-sign-in, firebase-sign-up, firebase-verify-email';

function validateOrgData(org) {
	return typeof org === 'object' && ! Object.is(null, org) && typeof org.createdBy === 'string';
}

async function getOrgDataFromForm(form, user) {
	console.log(user);
	const data = new FormData(form);
	const img = await resizeImageFile(data.get('logo'), { height: 256, type: PNG });
	const uuid = data.get('@identifier') || crypto.randomUUID();
	const snapshot = await uploadFile(img, `/logos/${uuid}/${img.name}`);
	const hoursAvailable = [{
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Sunday',
		opens: data.get('sundayHoursOpen'),
		closes: data.get('sundayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Monday',
		opens: data.get('mondayHoursOpen'),
		closes: data.get('mondayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Tuesday',
		opens: data.get('tuesdayHoursOpen'),
		closes: data.get('tuesdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Wednesday',
		opens: data.get('wednesdayHoursOpen'),
		closes: data.get('wednesdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Thursday',
		opens: data.get('thursdayHoursOpen'),
		closes: data.get('thursdayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Friday',
		opens: data.get('fridayHoursOpen'),
		closes: data.get('fridayHoursClose'),
	}, {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: 'Saturday',
		opens: data.get('saturdayHoursOpen'),
		closes: data.get('saturdayHoursClose'),
	}].filter(({ opens, closes }) => [opens, closes].every(time => typeof time === 'string' && time.length === 5));

	const org = {
		'@context': data.get('@context'),
		'@type': data.get('@type'),
		'@identifier': uuid,
		createdBy: user.uid,
		updatedAt: new Date().toISOString(),
		name: data.get('name'),
		description: data.get('description'),
		logo: await getDownloadURL(snapshot.ref),//data.get('logo'),
		telephone: data.get('telephone'),
		email: data.get('email'),
		url: data.get('url'),
		category: data.get('category'),
		subcategory: data.get('subcategory'),
		address: {
			'@type': 'PostalAddress',
			streetAddress: data.get('streetAddress'),
			postOfficeBoxNumber: data.get('postOfficeBoxNumber'),
			addressLocality: data.get('addressLocality'),
			addressRegion: data.get('addressRegion'),
			postalCode: data.get('postalCode'),
			addressCountry: data.get('addressCountry'),
			hoursAvailable,
		},
		sameAs: [
			data.get('facebook'), data.get('twitter'), data.get('linkedin'), data.get('youtube'),
		].filter(url => typeof url === 'string' && url.length !== 0 && URL.canParse(url)),
	};

	org.location = [org.address];
	org.contactPoints = [{
		'@type': 'ContactPoint',
		contactType: 'Main',
		availableLanguage: 'English',
		email: data.get('email'),
		telephone: data.get('telephone'),
		hoursAvailable,
	}];

	return org;
}

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

on(FIREBASE_FORMS, 'success', async ({ detail }) => {
	console.log(detail);
	const params = new URLSearchParams(location.search);

	if (params.has('redirect')) {
		navigate(params.get('redirect'));
	} else {
		navigate('/');
	}
});

on(FIREBASE_FORMS,'abort', ({ target }) => {
	if (target.dataset.hasOwnProperty('abortUrl')) {
		navigate(target.dataset.abortUrl);
	} else if (history.length > 1) {
		history.back();
	} else {
		navigate('/');
	}
});

on('#org-profile-form', 'submit', async event => {
	event.preventDefault();

	try {
		const user = await signIn();
		const org = await getOrgDataFromForm(event.target, user);

		if (validateOrgData(org)) {
			await createOrUpdateDoc('/organizations', org['@identifier'], org);
			await alert(`Created ${org.name}`);
			navigate('/');
		} else {
			await alert('Error creating Organization');
		}
	} catch(err) {
		console.error(err);
	}
});

each('[data-action]', el => {
	switch(el.dataset.action) {
		case 'sign-out':
			registerSignOutButton('[data-action="sign-out"]');
			break;
	}
});

document.querySelectorAll('.signed-out').forEach(el => disableOnSignIn(el));
document.querySelectorAll('.signed-in').forEach(el => disableOnSignOut(el));

if (location.pathname === '/account/' && location.search.includes('mode=')) {
	const params = new URLSearchParams(location.search);

	switch(params.get('mode')) {
		case 'resetPassword':
			navigate('/account/verify-reset/', {
				oobCode: params.get('oobCode'),
				redirent: '/account/sign-in/',
			});
			break;

		case 'verifyEmail':
			navigate('/account/verify-email/', {
				oobCode:  params.get('oobCode'),
				redirect: '/account/sign-in/',
			});
			break;

		case 'signIn':
			customElements.whenDefined('firebase-email-link').then(async HTMLFirebaseEmailLinkElement => {
				if (await HTMLFirebaseEmailLinkElement.verify()) {
					const result = await HTMLFirebaseEmailLinkElement.signIn();
					console.log(result);
				}
			});
			break;
	}
}
