import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';

export const handler = createHandler({
	get: async () => Response.json([]),
});
