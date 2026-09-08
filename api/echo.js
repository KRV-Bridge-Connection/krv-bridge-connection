import { readdir, stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const handler = async () => {
	try {
		const files = await readdir(__dirname);
		const fileContents = {};

		for (const file of files) {
			const filePath = join(__dirname, file);
			const fileStat = await stat(filePath);

			if (fileStat.isFile()) {
				fileContents[file] = await readFile(filePath, 'utf8');
			}
		}

		return Response.json({
			directory: __dirname,
			files: fileContents,
		});
	} catch (error) {
		return Response.json({ error: { message: error.message }});
	}
};
