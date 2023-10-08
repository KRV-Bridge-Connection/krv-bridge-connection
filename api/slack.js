/* eslint-env node */
import { HTTPError } from '@shgysk8zer0/http/error.js';
import { createHandler } from '@shgysk8zer0/netlify-func-utils/crud.js';
import { BAD_REQUEST, NOT_IMPLEMENTED, NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_DEFAULT, SLACK_PRIMARY, SLACK_DANGER,
} from '@shgysk8zer0/slack/slack.js';

import {
	isEmail, isString, isUrl, isTel, validateMessageHeaders, formatPhoneNumber,
} from '@shgysk8zer0/netlify-func-utils/validation.js';


const ALLOWED_ORIGINS = [
	'https://krvbridge.org',
	'https://beamish-halva-baf90b.netlify.app'
];

const ALLOWED_DOMAIN_SUFFIXES = [
	'--beamish-halva-baf90b.netlify.app',
	'--beamish-halva-baf90b.netlify.live',
	'.krvbridge.org', // Allows from any subdomain
];

if (typeof process.env.BASE_URL === 'string') {
	ALLOWED_ORIGINS.push(new URL(process.env.BASE_URL).origin);
}

function allowedOrigin(url) {
	const origin = new URL(url).origin;
	return ALLOWED_ORIGINS.includes(origin)
		|| ALLOWED_DOMAIN_SUFFIXES.some(suff => origin.endsWith(suff));
}

export const handler = createHandler({
	post: async req => {
		if (typeof process.env.SLACK_WEBHOOK_URL !== 'string') {
			throw new HTTPError('Not configured', { status: NOT_IMPLEMENTED });
		}

		const { subject, body, email, name, phone, origin, check, url } = await req.json();

		if (isString(check, { minLength: 0 })) {
			throw new HTTPError('Invalid data submitted', { status: BAD_REQUEST });
		} else if (! validateMessageHeaders({
			headers: {
				'x-message-id': req.headers.get('X-Message-Id'),
				'x-message-time': req.headers.get('X-Message-Time'),
				'x-message-origin': req.headers.get('X-Message-Origin'),
				'x-message-sig': req.headers.get('X-Message-Sig'),
				'x-message-algo': req.headers.get('X-Message-Algo'),
			}
		})) {
			throw new HTTPError('Invalid or missing signature', { status: BAD_REQUEST });
		} else if (! isString(subject, { minLength: 4 })) {
			throw new HTTPError('No subject given', { status: BAD_REQUEST });
		} else if (! isString(body, { minLength: 1 })) {
			throw new HTTPError('No body given', { status: BAD_REQUEST });
		} else if (! isString(name, 4)) {
			throw new HTTPError('No name given', { status: BAD_REQUEST });
		} else if (! isEmail(email)) {
			throw new HTTPError('No email address given or email is invalid', { status: BAD_REQUEST });
		} else if (! isUrl(origin)) {
			throw new HTTPError('Missing or invalid origin for message', { status: BAD_REQUEST });
		} else if (! allowedOrigin(origin) || ! allowedOrigin(req.headers.get('Origin'))) {
			throw new HTTPError('Not allowed', { status: BAD_REQUEST });
		}

		const nowId = Date.now().toString(34);
		const actions = new SlackActionsBlock({
			elements: [
				new SlackButtonElement(new SlackPlainTextElement(`Reply to <${email}>`), {
					url: `mailto:${email}`,
					action: `email-${nowId}`,
					style: SLACK_PRIMARY,
				}),
				new SlackButtonElement(new SlackPlainTextElement(`Open site <${new URL(origin).hostname}>`), {
					url: origin,
					action: `origin-${nowId}`,
					style: SLACK_DEFAULT,
				}),
			]
		});

		if (isUrl(url)) {
			actions.add(
				new SlackButtonElement(new SlackPlainTextElement(`Open <${new URL(url).hostname}>`),  {
					url: url,
					action: `link-${nowId}`,
					style: SLACK_DANGER,
				})
			);
		}

		const message = new SlackMessage(process.env.SLACK_WEBHOOK,
			new SlackHeaderBlock(new SlackPlainTextElement(`New message on ${origin}`)),
			new SlackSectionBlock(new SlackPlainTextElement(`Subject: ${subject}`), {
				fields: [
					new SlackMarkdownElement(`*From*: ${name}`),
					new SlackMarkdownElement(`*Phone*: ${isTel(phone) ? formatPhoneNumber(phone) : 'Not given'}`
					),
				],
			}),
			new SlackDividerBlock(),
			new SlackContextBlock({ elements: [new SlackPlainTextElement(body)] }),
			actions,
		);

		await message.send();

		return new Response(null, { status: NO_CONTENT });

	}
}, {
	allowHeaders: [
		'Content-Type', 'X-MESSAGE-ID', 'X-MESSAGE-TIME', 'X-MESSAGE-ORIGIN',
		'X-MESSAGE-SIG', 'X-MESSAGE-ALGO',
	],
});
