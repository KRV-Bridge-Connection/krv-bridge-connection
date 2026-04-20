import { HermesWorker } from '{{ importmap.imports["@aegisjsproject/hermes/"] }}worker.js';

const staticDirs = ['js', 'css', 'img', '.well-known'];
const partnerLogos = [
	'/img/partners/capk.svg',
	'/img/partners/cerro-coso.png',
	'/img/partners/flood.svg',
	'/img/partners/garden-pathways.svg',
	'/img/partners/gbla.svg',
	'/img/partners/kite.svg',
	'/img/branding/krv-bridge-logo-wide-blue.svg',
	'/img/partners/salvation-army.svg',
	'/img/partners/stewards.svg',
];

new HermesWorker([
	{
		name: 'krv-bridge-connection',
		version: '{{ app.version | default: pkg.version }}',
		strategy: 'network-first',
		pattern: new URLPattern({
			baseURL: location.origin,
			pathname: `/((?!(?:${staticDirs.join('|')}|api)/).*)`
		}),
		prefetch: [
			'/', '/about/', '/contact/', '/pantry/', '/resources/', '/partners/', '/volunteer/',
			'/donate/', '/account/', '/webapp.webmanifest', '/.well-known/jwks.json',
			'/.well-known/openid-configuration', '/firebase.json',
		].map(path => URL.parse(path, location.origin)),
	}, {
		name: 'krv-bridge-connection-assets',
		version: '{{ app.version | default: pkg.version }}',
		strategy: 'stale-while-revalidate',
		pattern: new URLPattern({
			baseURL: location.origin,
			pathname: `/(${staticDirs.join('|')})/*`,
		}),
		prefetch: [
			'/js/index.min.js', '/css/index.min.css', '/img/icons.svg', '/img/favicon.svg',
			'/js/routes/pantry.js', '/js/routes/partners.js', '/js/routes/volunteer.js',
			'/js/components/g-cal.js', '/img/apple-touch-icon.png', '/img/icon-192.png',
			'/js/routes/404.js', '/js/routes/contact.js', '/js/consts.js', '/js/functions.js',
			...partnerLogos,
		].map(path => URL.parse(path, location.origin)),
	}, {
		name: 'unpkg',
		strategy: 'cache-first',
		pattern: new URLPattern({ hostname: 'https://unpkg.com/', pathname: '/*' }),
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
	}, {
		name: 'imgur',
		strategy: 'cache-first',
		pattern: new URLPattern({
			baseURL: 'https://i.imgur.com',
			pathname: '/*',
		}),
	}, {
		name: 'google-static',
		strategy: 'cache-first',
		pattern: new URLPattern({
			hostname: '(.*\\.)?(firebaseio\\.com|firebaseapp\\.com|web\\.app|firebasestorage\\.googleapis\\.com|fonts\\.googleapis\\.com|gstatic\\.com)',
			pathname: '/(.*\\.(?:js|css|woff2?|ttf|otf|eot))',
		}),
		prefetch: [
			'{{ importmap.imports["firebase/app"] }}',
			'{{ importmap.imports["firebase/auth"] }}',
		]
	},
]);
