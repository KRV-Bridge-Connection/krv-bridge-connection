/* eslint-env node */
import { createHandler } from '@shgysk8zer0/lambda-http';

export default createHandler({
	async get() {
		return new Response(['Hello, World!'], { headers: { 'Content-Type': 'text/plain' }});
	}
});
