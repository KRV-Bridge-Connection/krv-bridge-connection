export const GA = null;

export const env = (location.hostname === 'localhost' || location.hostname.endsWith('.netlify.live'))
	? 'development'
	: 'production';

export const dev = env === 'development';

export const site = {
	title: 'KRV Bridge Connection',
};

export const pubicKey = '{"key_ops":["verify"],"ext":true,"kty":"EC","x":"ABFjmkSnylwGBEi4t-tSw3j-UMTT02-fL_NLNxcK2gY-6W_uilRJPvqM2Wgq71f5nGg2ontbMcpiskFHU45V6z6B","y":"AVBI0voImW_f1_OpF3Q9O4z1KHAddnn6lbJRHOLLw__NjHweBjct8OrJH3LvHZ2PqoFsXdbEyC2uFIr4vKbmROr-","crv":"P-521"}';
