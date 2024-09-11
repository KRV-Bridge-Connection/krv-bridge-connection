export const GA = null;

export const env = (location.hostname === 'localhost' || location.hostname.endsWith('.netlify.live'))
	? 'development'
	: 'production';

export const dev = env === 'development';

export const site = {
	title: 'KRV Bridge Connection',
};

export const pubicKey = '{"key_ops":["verify"],"ext":true,"kty":"EC","x":"TSyH_WceOud8bA_jN4FLnn2Mucn1XuGAdLrPU38NxoQ","y":"QhnIVTKPjIjqbFbLn1K4WM4KdVSvb95zGqpNEyrIRIE","crv":"P-256"}';
