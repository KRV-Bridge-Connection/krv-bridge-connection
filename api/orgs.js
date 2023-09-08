/* eslint-env node */
exports.handler = async event => {
	if (! process.env.hasOwnProperty('FIREBASE_CERT')) {
		return {
			statusCode: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
			body: JSON.stringify({
				error: {
					status: 500,
					message: 'Missing Firebase Certificate',
				}
			})
		};
	}

	switch(event.httpMethod) {
		case 'GET':
			if (event.queryStringParameters.hasOwnProperty('id')) {
				return {
					statusCode: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Content-Security-Policy': 'default-src \'self\'',
					},
					body: JSON.stringify({
						httpMethod: event.httpMethod,
						path: event.path,
						headers: event.headers,
						queryStringParameters: event.queryStringParameters,
					}),
				};
			} else {
				return {
					statusCode: 200,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
					body: JSON.stringify({
						foo: 'bar',
					})
				};
			}
	}
};
