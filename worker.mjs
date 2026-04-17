import { HermesWorker } from '{{ importmap.imports["@aegisjsproject/hermes/"] }}worker.js';

try {
	new HermesWorker([
		{
			name: 'krv-bridge-connection',
			version: '{{ app.version | default: pkg.version }}',
			strategy: 'network-first',
			pattern: new URLPattern({
				baseURL: location.origin,
				pathname: '/((?!api(?:\\/|$))[^\\/]*){/*}?', // Everything except `/api/*`
			}),
			prefetch: [
				// Pages
				'/', '/about/', '/contact/', '/pantry/', '/resources/', '/partners/', '/volunteer/',
				'/donate/', '/account/',
				// Assets
				'/js/index.min.js', '/css/index.min.css', '/img/icons.svg', '/img/favicon.svg',
				'/js/routes/pantry.js', '/js/routes/partners.js', '/js/routes/volunteer.js',
				'/js/components/g-cal.js', '/img/apple-touch-icon.png', '/img/icon-192.png',
				'/js/routes/404.js', '/js/routes/contact.js', '/js/consts.js', '/js/functions.js',
			].map(path => URL.parse(path, location.origin)),
		},
		{
			name: 'unpkg',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://unpkg.com/', pathname: '/*' }),
			prefetch: [
				'{{ importmap.imports["@aegisjsproject/router"] }}',
				'{{ importmap.imports["@aegisjsproject/idb"] }}',
				'{{ importmap.imports["@aegisjsproject/core/"] }}parsers/html.js',
				'{{ importmap.imports["@aegisjsproject/core/"] }}parsers/css.js',
				'{{ importmap.imports["@aegisjsproject/core/"] }}stringify.js',
				'{{ importmap.imports["@aegisjsproject/core/"] }}dom.js',
				'{{ importmap.imports["@aegisjsproject/markdown"] }}',
				'{{ importmap.imports["@aegisjsproject/url/"] }}search.js',
				'{{ importmap.imports["@aegisjsproject/callback-registry/"] }}callbackRegistry.js',
				'{{ importmap.imports["@aegisjsproject/callback-registry/"] }}callbacks.js',
				'{{ importmap.imports["@aegisjsproject/callback-registry/"] }}events.js',
				'{{ importmap.imports["@aegisjsproject/state/"] }}state.js',
				'{{ importmap.imports["@aegisjsproject/state"] }}',
				'{{ importmap.imports["@aegisjsproject/firebase-account-routes"] }}',
				'{{ importmap.imports["@aegisjsproject/firebase-account-routes/"] }}auth.js',
				'{{ importmap.imports["@aegisjsproject/disposable-registry"] }}',
			]
		},
		{
			name: 'imgur',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://i.imgur.com/', pathname: '/*' }),
		},
		{
			name: 'google-fonts',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://fonts.googleapis.com/', pathname: '/*' }),
		}
	]);
} catch(err) {
	console.error(err);
}
