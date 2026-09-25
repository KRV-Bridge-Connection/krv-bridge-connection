import { createHandler, HTTPBadGatewayError } from '@shgysk8zer0/lambda-http';
// import { putCollectionItem, getCollectionItems } from './utils.js';

export default createHandler({
	async post(req) {
		const data = await req.formData();

		if (! data.has('scriptAction')) {
			throw new HTTPBadGatewayError('Invalid request.');
		} else {
			console.log(data);

			switch(data.get('scriptAction')) {
				default:
					return Response.json({ message: `Submitted ${data.get('scriptAction')}.`});
			}

		}
	}
});
