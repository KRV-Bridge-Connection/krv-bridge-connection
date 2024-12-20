require('@shgysk8zer0/polyfills');
const { exportAsRFC7517JWK, importJWK } = require('@shgysk8zer0/jwk-utils');
const { readFile } = require('node:fs/promises');

module.exports.data = () => ({ permalink: '/.well-known/jwks.json' });

module.exports.render = async () => {
	const keys = ['_data/jwk.json'];

	return JSON.stringify({ keys: await Promise.all(keys.map(async path => {
		const content = await readFile(path, { encoding: 'utf-8' });
		const jwk = await importJWK(JSON.parse(content));
		return exportAsRFC7517JWK(jwk);
	}))});
};
