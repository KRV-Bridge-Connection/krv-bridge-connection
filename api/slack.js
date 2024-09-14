/* eslint-env node */
import '@shgysk8zer0/polyfills';
import { HTTPBadRequestError, HTTPNotImplementedError, HTTPForbiddenError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http/error.js';
import { createHandler } from '@shgysk8zer0/lambda-http/handler.js';
import { NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { importJWK } from '@shgysk8zer0/jwk-utils/jwk.js';
import { verifyJWT, getRequestToken } from '@shgysk8zer0/jwk-utils/jwt.js';
import { isEmail, isString, isTel, formatPhoneNumber } from '@shgysk8zer0/netlify-func-utils/validation.js';
import { readFile } from 'node:fs/promises';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_PRIMARY,
} from '@shgysk8zer0/slack/slack.js';

const REVOKED_TOKENS = [];

async function getPublicKey() {
	const keyData = JSON.parse(await readFile('_data/jwk.json', { encoding: 'utf-8' }));
	return await importJWK(keyData);
}

export default createHandler({
	async post(req) {
		const token = getRequestToken(req);
		const origin = URL.parse(req.headers.get('Origin') ?? req.referrer)?.origin;

		if (typeof origin !== 'string' || origin === 'null') {
			throw new HTTPBadRequestError('Missing required origin in request.');
		} else if (typeof token !== 'string') {
			throw new HTTPUnauthorizedError('Message is missing required authorization.');
		} else if (typeof process.env.SLACK_WEBHOOK_URL !== 'string') {
			throw new HTTPNotImplementedError('Not configured');
		} else {
			const publicKey = await getPublicKey();
			const result = await verifyJWT(token, publicKey, {
				claims: ['iss', 'exp', 'iat', 'nbf', 'jti', 'entitlements'],
				entitlements: ['slack:send'],
			});

			if (result instanceof Error || result === null) {
				throw new HTTPForbiddenError('Invalid or expired token', { cause: result });
			} else if (REVOKED_TOKENS.includes(result.jti)) {
				throw new HTTPForbiddenError(`Token ${result.jti} has been revoked.`);
			} else {
				const { subject, body, email, name, phone } = await req.json();

				if (! isString(subject, { minLength: 4 })) {
					throw new HTTPBadRequestError('No subject given');
				} else if (! isString(body, { minLength: 1 })) {
					throw new HTTPBadRequestError('No body given');
				} else if (! isString(name, 4)) {
					throw new HTTPBadRequestError('No name given');
				} else if (! isEmail(email)) {
					throw new HTTPBadRequestError('No email address given or email is invalid');
				} else {
					const nowId = Date.now().toString(34);

					const message = new SlackMessage(process.env.SLACK_WEBHOOK,
						new SlackHeaderBlock(new SlackPlainTextElement(`New message on ${origin}`)),
						new SlackSectionBlock(new SlackPlainTextElement(`Subject: ${subject}`), {
							fields: [
								new SlackMarkdownElement(`*From*: ${name}`),
								new SlackMarkdownElement(`*Phone*: ${isTel(phone) ? formatPhoneNumber(phone) : 'Not given'}`),
							],
						}),
						new SlackDividerBlock(),
						new SlackContextBlock({ elements: [new SlackPlainTextElement(body)] }),
						new SlackActionsBlock({
							elements: [
								new SlackButtonElement(new SlackPlainTextElement(`Reply to <${email}>`), {
									url: `mailto:${email}`,
									action: `email-${nowId}`,
									style: SLACK_PRIMARY,
								}),
							]
						})
					);

					await message.send();

					return new Response('', { status: NO_CONTENT });
				}
			}
		}
	}
}, {
	allowCredentials: true,
	allowOrigins: /^https:\/\/(krvbridge\.org)|([A-z0-9]+--beamish-halva-baf90b\.netlify\.(live|app))$/,
	requireHeaders: ['Authorization'],
	allowHeaders: [ 'Content-Type', 'Authorization'],
	requireContentLength: true,
	requireCORS: true,
});
