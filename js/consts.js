export const GA = null;

export const firebaseConfig = {
	apiKey: 'AIzaSyCr-Zon7TVnHH0yT0trju0qz4HAwDG687E',
	authDomain: 'krv-bridge-demo.firebaseapp.com',
	projectId: 'krv-bridge-demo',
	storageBucket: 'krv-bridge-demo.appspot.com',
	messagingSenderId: '291669978694',
	appId: '1:291669978694:web:a5984e1f0f84b900e36447',
};

export const env = (location.hostname === 'localhost' || location.hostname.endsWith('.netlify.live'))
	? 'development'
	: 'production';

export const dev = env === 'development';

export const site = {
	title: 'Jekyll Template',
};
