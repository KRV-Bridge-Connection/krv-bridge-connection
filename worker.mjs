import { HermesWorker } from '{{ importmap.imports["@aegisjsproject/hermes/"] }}worker.js';

try {
	new HermesWorker([
		{
			name: 'krv-bridge-connection',
			version: '{{ app.version | default: pkg.version }}',
			strategy: 'network-first',
			pattern: new URLPattern({
				baseURL: location.origin,
				pathname: '/((?:about|contact|pantry|partners|resources|account|volunteer|donate)(?:/.*)?|)'
			}),
			prefetch: [
				'/', '/about/', '/contact/', '/pantry/', '/resources/', '/partners/', '/volunteer/',
				'/donate/', '/account/',
			].map(path => URL.parse(path, location.origin)),
		},
		{
			name: 'krc-bridge-connection-assets',
			version: '{{ app.version | default: pkg.version }}',
			strategy: 'stale-while-revalidate',
			pattern: new URLPattern({ baseURL: location.origin, pathname: '/(img|css|js|fonts)/*'}),
			prefetch: [
				'/js/index.min.js', '/css/index.min.css', '/img/icons.svg', '/img/favicon.svg',
				'/js/routes/pantry.js', '/js/routes/partners.js', '/js/routes/volunteer.js',
				'/js/components/g-cal.js', '/img/apple-touch-icon.png', '/img/icon-192.png',
				'/js/routes/404.js',
			].map(path => URL.parse(path, location.origin)),
		},
		{
			name: 'unpkg',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://unpkg.com/', pathname: '/*' }),
		},
		{
			name: 'imgur',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://i.imgur.com/', pathname: '/*' }),
		},
		{
			name: 'google-fonts',
			strategy: 'cache-first',
			pattern: new URLPattern({ baseURL: 'https://fonts.googleapis.com/' }),
		}
	]);
} catch(err) {
	console.error(err);
}
