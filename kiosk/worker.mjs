/// <reference lib="webworker" />
import { HermesWorker } from '{{ importmap.imports["@aegisjsproject/hermes/"] }}worker.js';

const staticDirs = ['js', 'css', 'kiosk', 'img', '.well-known'];

new HermesWorker([
	{
		name: 'krv-bridge-connection-kiosk',
		version: '{{ app.version | default: pkg.version }}',
		strategy: 'network-first',
		pattern: new URLPattern({
			baseURL: location.origin,
			pathname: `/((?!(?:${staticDirs.join('|')}|api)/).*)`
		}),
		prefetch: [
			'/kiosk/', '/kiosk/kiosk.js', '/kiosk/kiosk.css', '/kiosk/', '/404.html', '/partners.json',
		].map(path => URL.parse(path, location.origin)),
		fallback: new URL('/404.html', location.origin),
	},{
		name: 'unpkg',
		strategy: 'cache-first',
		pattern: new URLPattern({ baseURL: 'https://unpkg.com/', pathname: '/*' }),
	}, {
		name: 'imgur',
		strategy: 'cache-first',
		pattern: new URLPattern({
			baseURL: 'https://i.imgur.com',
			pathname: '/*',
		}),
	},
]);
