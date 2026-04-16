import { HermesWorker } from '{{ importmap.imports["@aegisjsproject/hermes"] }}';
import { Importmap } from '{{ importmap.imports["@shgysk8zer0/importmap/"] }}imap.js';

try {
	const importmap = new Importmap(JSON.parse('{{ importmap | jsonify }}'));

	const worker = new HermesWorker([
		{
			name: 'krv-bridge-connection',
			version: '{{ app.version | default: pkg.version }}',
			strategy: 'network-first',
			pattern: new URLPattern({
				baseURL: location.origin,
				pathname: '/((?:about|contact|pantry|partners|resources|account|volunteer|donate)(?:/.*)?|)'
			}),
			preload: ['/', '/about/', '/contact/', '/pantry/', '/resources/', '/partners/', '/volunteer/', '/donate/', '/account/'],
		},
		{
			name: 'krc-bridge-connection-assets',
			version: '{{ app.version | default: pkg.version }}',
			strategy: 'stale-while-revalidate',
			pattern: new URLPattern({ baseURL: location.origin, pathname: '/(img|css|js|fonts)/*'}),
			preload: [
				'/js/index.min.js', '/css/index.min.css', '/img/icons.svg', '/img/favicon.svg',
				'/js/routes/pantry.js', '/js/routes/partners.js', '/js/routes/volunteer.js',
				'/js/components/g-cal.js', '/img/apple-touch-icon.png', '/img/icon-192.png',
				'/js/routes/404.js',
			],
		},
		{
			name: 'unpkg',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://unpkg.com', pathname: '/*' }),
			preload: [
				'@shgysk8zer0/polyfills', '@aegisjsproject/core/parsers/html.js', '@aegisjsproject/core/parsers/css.js',
				'@aegisjsproject/core/stringify.js', '@aegisjsproject/core/dom.js', '@aegisjsproject/idb',
				'@aegisjsproject/disposable-registry', '@aegisjsproject/iota', '@aegisjsproject/callback-registry/callbacks.js',
				'@aegisjsproject/callback-registry/events.js', '@shgysk8zer0/consts/date.js', '@aegisjsproject/attempt',
				'@shgysk8zer0/kazoo/geo.js', '@aegisjsproject/command', '@aegisjsproject/jwk-utils/jwk.js', '@aegisjsproject/jwk-utils/jwt.js',
				'@aegisjsproject/markdown', '@aegisjsproject/url/search.js', '@aegisjsproject/url/url.min.js', '@shgysk8zer0/signals',
			].map(specifier => importmap.resolve(specifier))
		},
		{
			name: 'imgur',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://i.imgur.com', pathname: '/*' }),
		}
	]);

	console.log(worker);
} catch(err) {
	console.error(err);
}
