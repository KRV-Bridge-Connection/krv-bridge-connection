/* eslint-env node */

export default async () => {
	return new Response(['Hello, World!'], { headers: { 'Content-Type': 'text/plain' }});
};
