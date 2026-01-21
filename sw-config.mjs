/* eslint-env serviceworker */
/* eslint no-unused-vars: 0*/
'use strict';

async function updateAssets(assets, {
	// referrerPolicy = 'no-referrer',
	version = '{{ app.version | default: pkg.version }}',
} = {}) {
	if (Array.isArray(assets) && assets.length !== 0) {
		const cache = await caches.open(version);
		await Promise.allSettled(assets.filter(url => url.length !== 0).map(async url => {
			const req = new Request(new URL(url, location.origin), { referrerPolicy: 'no-referrer' });
			const resp = await fetch(req);

			if (resp.ok) {
				await cache.put(req, resp);
			}
		}));
	}
}

const config = {
	version: '{{ app.version | default: pkg.version }}',
	fresh: [
		/* Pages */
		'/',
		'/about/',
		'/donate/',
		'/branding/',
		'/webapp.webmanifest',
		'https://apps.kernvalley.us/apps.json',
		'https://cdn.kernvalley.us/img/markers.svg',
		// Routes/modules
		'/js/routes/partners.js',
		'/js/routes/pantry.js',
		'/js/routes/contact.js',
		'/js/routes/posts.js',
		'/js/routes/volunteer.js',
		'/js/routes/pantry-distribution.js',
		'/js/routes/digital-signage.js',
		/* Other */
	].map(path => new URL(path, location.origin).href),
	stale: [
		'/contact/',
		'/volunteer/',
		'/pantry/',
		'/pantry/distribution',
		'/account/',
		/* Scripts */
		'/js/index.min.js',
		'/js/consts.js',
		'/js/functions.js',
		'{{ importmap.imports["@shgysk8zer0/polyfills"] }}',
		/* Route handler modules */
		'{{ importmap.imports["@aegisjsproject/state"] }}',
		'{{ importmap.imports["@aegisjsproject/router"] }}',
		'{{ importmap.imports["@aegisjsproject/core/"] }}parsers/html.js',
		'{{ importmap.imports["@aegisjsproject/core/"] }}parsers/css.js',
		'{{ importmap.imports["@aegisjsproject/idb"] }}',
		'{{ importmap.imports["@aegisjsproject/callback-registry/"] }}callbacks.js',
		'{{ importmap.imports["@aegisjsproject/callback-registry/"] }}events.js',
		'{{ importmap.imports["@aegisjsproject/core/"] }}stringify.js',
		'{{ importmap.imports["@aegisjsproject/core/"] }}dom.js',
		'{{ importmap.imports["@shgysk8zer0/consts/"] }}date.js',
		'{{ importmap.imports["@aegisjsproject/attempt"] }}',
		'{{ importmap.imports["@shgysk8zer0/konami"] }}',
		'{{ importmap.imports["@shgysk8zer0/kazoo/"] }}geo.js',
		'{{ importmap.imports["@aegisjsproject/commands"] }}',
		'{{ importmap.imports["@aegisjsproject/markdown"] }}',
		'{{ importmap.imports["@aegisjsproject/url/"] }}search.js',
		/* Images & Icons */
		'/img/icons.svg',
		'/img/apple-touch-icon.png',
		'/img/icon-192.png',
		'/img/favicon.svg',
		'/firebase.json',
		'/.well-known/jwks.json',
		// 'https://cdn.kernvalley.us/img/logos/firefox.svg',
		// 'https://cdn.kernvalley.us/img/logos/chrome.svg',
		'https://cdn.kernvalley.us/img/keep-kern-clean.svg',
		'https://cdn.kernvalley.us/img/logos/play-badge.svg',
		'/img/octicons/info.svg',
		'/img/adwaita-icons/status/avatar-default.svg',
		'/js/routes/404.js',

		/* Fonts */
		'https://cdn.kernvalley.us/fonts/roboto.woff2',
	].map(path => new URL(path, location.origin).href),
	allowed: [
		'https://www.google-analytics.com/analytics.js',
		'https://www.googletagmanager.com/gtag/js',
		'https://i.imgur.com/',
		'https://maps.wikimedia.org/osm-intl/',
		'https://cdn.kernvalley.us/img/',
		'https://unpkg.com/@shgysk8zer0/',
		'https://unpkg.com/@aegisjsproject/',
		'https://unpkg.com/@kernvalley/',
		/https:\/\/\w+\.githubusercontent\.com\/u\/*/,
		new URL('/img/raster/', location.origin).href,
		/\.(jpg|png|webp|svg|gif)$/,
	],
	allowedFresh: [
		new URL('/paths/', location.origin).href,
		new URL('/js/routes/', location.origin).href,
		'https://api.openweathermap.org/data/',
		'https://api.github.com/users/',
		/\.(html|css|js|json)$/,
	],
	periodicSync: {
		'main-assets': async () => await updateAssets([
			'/js/index.min.js',
			'/css/index.min.css',
			'/img/icons.svg',
			'/webapp.webmanifest',
		]),
		'pinned-pages': async () => await updateAssets([
			'/',
			'/pantry/',
			'/contact/',
			'/partners/',
			'/resources/',
			'/about/',
			'/donate/',
			'/volunteer/',
			'/account/',
		]),
		'recent-posts': async () => await updateAssets(['{{ site.posts | map: "url" | join: "', '" }}']),
	}
};

