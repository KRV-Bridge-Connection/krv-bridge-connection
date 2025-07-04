export const GA = null;

export const env = (location.hostname === 'localhost' || location.hostname.endsWith('.netlify.live'))
	? 'development'
	: 'production';

export const dev = env === 'development';

export const site = {
	title: 'KRV Bridge Connection',
};

export const DB_VERSION = 9;
export const ORG_TOKEN_KEY = 'token:expires';

export const pubicKey = '{"key_ops":["verify"],"ext":true,"kty":"EC","x":"TSyH_WceOud8bA_jN4FLnn2Mucn1XuGAdLrPU38NxoQ","y":"QhnIVTKPjIjqbFbLn1K4WM4KdVSvb95zGqpNEyrIRIE","crv":"P-256"}';
export const SLACK = new Uint8Array([101, 121, 74, 104, 98, 71, 99, 105, 79, 105, 74, 70, 85, 122, 73, 49, 78, 105, 73, 115, 73, 109, 116, 112, 90, 67, 73, 54, 73, 109, 85, 120, 90, 68, 70, 104, 77, 68, 78, 104, 78, 122, 107, 53, 90, 84, 107, 119, 79, 71, 81, 53, 78, 50, 74, 108, 89, 84, 69, 53, 78, 84, 99, 49, 77, 122, 107, 53, 79, 68, 77, 49, 78, 122, 77, 49, 90, 106, 103, 48, 89, 84, 99, 119, 90, 68, 89, 48, 79, 84, 107, 49, 90, 71, 78, 107, 89, 87, 73, 50, 77, 50, 77, 52, 79, 84, 104, 104, 79, 87, 69, 48, 90, 109, 73, 105, 76, 67, 74, 48, 101, 88, 65, 105, 79, 105, 74, 75, 86, 49, 81, 105, 102, 81, 46, 101, 121, 74, 112, 99, 51, 77, 105, 79, 105, 74, 111, 100, 72, 82, 119, 99, 122, 111, 118, 76, 50, 116, 121, 100, 109, 74, 121, 97, 87, 82, 110, 90, 83, 53, 118, 99, 109, 99, 105, 76, 67, 74, 104, 100, 87, 81, 105, 79, 105, 74, 111, 100, 72, 82, 119, 99, 122, 111, 118, 76, 50, 116, 121, 100, 109, 74, 121, 97, 87, 82, 110, 90, 83, 53, 118, 99, 109, 99, 105, 76, 67, 74, 112, 89, 88, 81, 105, 79, 106, 69, 51, 77, 122, 85, 49, 77, 84, 99, 49, 78, 84, 103, 115, 73, 109, 53, 105, 90, 105, 73, 54, 77, 84, 99, 122, 78, 84, 85, 120, 78, 122, 85, 49, 79, 67, 119, 105, 97, 110, 82, 112, 73, 106, 111, 105, 90, 106, 90, 107, 78, 122, 73, 122, 77, 109, 77, 116, 90, 106, 89, 120, 89, 121, 48, 48, 89, 106, 108, 106, 76, 87, 70, 109, 78, 84, 99, 116, 89, 122, 65, 49, 78, 122, 99, 120, 89, 122, 99, 120, 78, 122, 107, 121, 73, 105, 119, 105, 99, 50, 78, 118, 99, 71, 85, 105, 79, 105, 74, 122, 98, 71, 70, 106, 97, 121, 73, 115, 73, 109, 86, 117, 100, 71, 108, 48, 98, 71, 86, 116, 90, 87, 53, 48, 99, 121, 73, 54, 87, 121, 74, 122, 98, 71, 70, 106, 97, 122, 112, 122, 90, 87, 53, 107, 73, 108, 49, 57, 46, 67, 75, 120, 65, 113, 109, 68, 49, 88, 74, 89, 115, 87, 54, 106, 85, 50, 88, 74, 75, 99, 74, 82, 111, 73, 110, 73, 71, 119, 95, 73, 70, 97, 90, 113, 86, 54, 74, 50, 67, 117, 100, 55, 108, 73, 56, 102, 49, 98, 115, 116, 69, 117, 109, 49, 73, 49, 90, 76, 95, 95, 118, 119, 121, 81, 109, 109, 73, 66, 49, 112, 105, 105, 90, 53, 77, 53, 49, 51, 101, 57, 98, 86, 89, 82, 65]);

export const SCHEMA = {
	name: 'krv-bridge',
	version: DB_VERSION,
	stores: {
		posts: {
			keyPath: 'url',
			autoIncrement: false,
			indexes: {
				title: {
					keyPath: 'title',
					multiEntry: false,
					unique: false,
				},
				keywords: {
					keyPath: 'keywords',
					multiEntry: true,
					unique: false,
				},
				id: {
					keyPath: 'id',
					multiEntry: false,
					unique: true,
				},
				created: {
					keyPath: 'created',
					multiEntry: false,
					unique: false,
				}
			}
		},
		partners: {
			keyPath: 'id',
			autoIncrement: false,
			indexes: {
				name: {
					keyPath: 'name',
					multiEntry: false,
					unique: true,
				},
				categories: {
					keyPath: 'categories',
					multiEntry: true,
					unique: false,
				},
				keywords: {
					keyPath: 'keywords',
					multiEntry: true,
					unique: false,
				},
				partner: {
					keyPath: 'partner',
					multiEntry: true,
					unique: false,
				},
			},
		},
		inventory: {
			keyPath: 'id',
			autoIncrement: false,
			indexes: {
				name: {
					keyPath: 'name',
					multiEntry: false,
					unique: false,
				},
			},
		},
		eventGuests: {
			keyPath: 'id',
			autoIncrement: false,
			indexes: {
				email: {
					keyPath: 'email',
					multiEntry: false,
					unique: true,
				}
			}
		}
	},
};
