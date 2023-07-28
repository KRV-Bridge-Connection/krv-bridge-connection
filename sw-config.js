---
layout: null
permalink: /sw.js
---
/* eslint-env serviceworker */
/* eslint no-unused-vars: 0*/
'use strict';

async function updateAssets(assets, {
	referrerPolicy = 'no-referrer',
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
		'{{ site.pages | where: "pinned", true | map: "url" | join: "', '" }}',
		'/webapp.webmanifest',
		'https://apps.kernvalley.us/apps.json',
		'https://cdn.kernvalley.us/img/markers.svg',
		/* Other */
	].map(path => new URL(path, location.origin).href),
	stale: [
		/* Scripts */
		'/js/index.min.js',
		'{{ importmap.imports["@shgysk8zer0/polyfills"] }}',
		'{{ importmap.imports["@shgysk8zer0/kazoo/"] }}harden.js',
		'{{ importmap.imports["@shgysk8zer0/components/"] }}leaflet/map.min.js',

		/* Custom Element Templates */
		'{{ importmap.imports["@shgysk8zer0/components/"] }}/weather/current.html',
		'{{ importmap.imports["@shgysk8zer0/components/"] }}/github/user.html',

		/* CSS */
		'/css/index.min.css',
		'{{ importmap.imports["@shgysk8zer0/components/"] }}weather/current.css',
		'{{ importmap.imports["@shgysk8zer0/components/"] }}github/user.css',
		'{{ importmap.imports["@shgysk8zer0/components/"] }}leaflet/map.css',

		/* Images & Icons */
		'/img/icons.svg',
		'/img/apple-touch-icon.png',
		'/img/icon-192.png',
		'/img/favicon.svg',
		'https://cdn.kernvalley.us/img/logos/firefox.svg',
		'https://cdn.kernvalley.us/img/logos/chrome.svg',
		'https://cdn.kernvalley.us/img/keep-kern-clean.svg',
		'https://cdn.kernvalley.us/img/logos/play-badge.svg',
		'/img/octicons/info.svg',
		'/img/adwaita-icons/status/avatar-default.svg',

		/* Event Images */
		'/img/raster/rodeo.jpg',
		'/img/raster/parade.jpg',
		'/img/raster/encampment.jpg',
		'/img/raster/coach-320.jpg',

		/* Fonts */
		'https://cdn.kernvalley.us/fonts/roboto.woff2',
		'https://cdn.kernvalley.us/fonts/rye.woff2',
	].map(path => new URL(path, location.origin).href),
	allowed: [
		'https://www.google-analytics.com/analytics.js',
		'https://www.googletagmanager.com/gtag/js',
		'https://i.imgur.com/',
		'https://maps.wikimedia.org/osm-intl/',
		'https://cdn.kernvalley.us/img/',
		/https:\/\/\w+\.githubusercontent\.com\/u\/*/,
		new URL('/img/raster/', location.origin).href,
		/\.(jpg|png|webp|svg|gif)$/,
	],
	allowedFresh: [
		new URL('/paths/', location.origin).href,
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
			'{{ site.pages | where: "pinned", true | map: "url" | join: "', '" }}'
		]),
		'recent-posts': async () => await updateAssets(['{{ site.posts | map: "url" | join: "', '" }}']),
	}
};
