import { createHandler, Cookie } from '@shgysk8zer0/lambda-http';

export default createHandler({
	async get(req) {
		if (req.cookies.has('org-jwt')) {
			const cookie = new Cookie({
				name: 'org-jwt',
				value: null,
				expires: -1,
				path: '/api/',
				sameSite: 'strict',
				secure: true,
				httpOnly: true,
				partitioned: true,
			});

			return new Response(null, {
				headers: { 'Set-Cookie': cookie },
				status: 205,
			});
		} else {
			return new Response(null, { status: 204 });
		}
	}
});
