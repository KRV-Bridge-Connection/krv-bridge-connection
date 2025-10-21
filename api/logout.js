import { createHandler, Cookie } from '@shgysk8zer0/lambda-http';

export default createHandler({
	async get() {
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
			status: 201,
		});
	}
});
