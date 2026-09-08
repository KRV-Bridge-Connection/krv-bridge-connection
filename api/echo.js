import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import '@shgysk8zer0/polyfills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = async () => {
	try {
		const files = await readdir(__dirname);
		const content = await readFile(__filename, 'utf8');

		return {
			statusCode: 200,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				directory: __dirname,
				files: files,
				currentFileContent: content
			}, null, '\t')
		};
	} catch (error) {
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ error: error.message })
		};
	}
};
