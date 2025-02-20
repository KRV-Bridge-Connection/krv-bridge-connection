import { createHandler, HTTPBadRequestError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem } from './utils.js';
import { encrypt, BASE64, getSecretKey } from '@shgysk8zer0/aes-gcm';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_PRIMARY,
} from '@shgysk8zer0/slack';

const FORMAT = {
	dateStyle: 'medium',
	timeStyle: 'short',
};

const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.[A-Za-z\d]+$/;

function _isEmail(str) {
	return typeof str === 'string' && str.length > 5 && EMAIL_PATTERN.test(str);
}

export default createHandler({
	async post(req) {
		const data = await req.formData();
		const missing = ['name', 'household', 'addressLocality', 'postalCode', 'date', 'time', 'email'].filter(field => ! data.has(field));

		if (missing.length === 0) {
			const key = await getSecretKey();
			const date = new Date(`${data.get('date')}T${data.get('time')}`);
			const household = parseInt(data.get('household'));

			if (Number.isNaN(date.getTime())) {
				throw new HTTPBadRequestError('Invalid date/time given.');
			} else if (! Number.isSafeInteger(household) || household < 1 || household > 8) {
				throw new HTTPBadRequestError(`Invalid household size: ${data.get('household')}.`);
			} else if (! _isEmail(data.get('email'))) {
				throw new HTTPBadRequestError(`Invalid email address: "${data.get('email')}"`);
			} else {
				const [email, telephone, comments] = await Promise.all(
					['email', 'telephone', 'comments'].map(field => data.has(field) ? encrypt(key, data.get(field), { output: BASE64 }) : null)
				);
				const result = await addCollectionItem('pantry-schedule', {
					name: data.get('name'),
					email,
					telephone,
					addressLocality: data.get('addressLocality'),
					postalCode: data.get('postalCode'),
					household: parseInt(data.get('household')),
					comments,
					created: new Date(),
					date,
					points: parseInt(data.get('household')) * 30,
				});

				const nowId = Date.now().toString(34);

				const message = new SlackMessage(process.env.SLACK_WEBHOOK,
					new SlackHeaderBlock(new SlackPlainTextElement('New Food Pantry Appointment')),
					new SlackSectionBlock(new SlackPlainTextElement(`Date: ${date.toLocaleString('en', FORMAT)}`), {
						fields: [
							new SlackMarkdownElement(`*Name*: ${data.get('name')}`),
							new SlackMarkdownElement(`*Phone*: ${data.has('telephone') ? data.get('telephone') : 'Not given'}`),
						],
					}),
					new SlackDividerBlock(),
					new SlackContextBlock({ elements: [new SlackPlainTextElement(data.get('comments') || 'No Comments')] }),
					new SlackActionsBlock({
						elements: [
							new SlackButtonElement(new SlackPlainTextElement(`Reply to <${data.get('email')}>`), {
								url: `mailto:${data.get('email')}`,
								action: `email-${nowId}`,
								style: SLACK_PRIMARY,
							}),
						]
					})
				);

				await message.send({ signal: req.signal }).catch(console.error);

				return Response.json({
					id: result.id,
					message: `Your appointment has been scheduled for ${date.toLocaleString('en', FORMAT)}. Your reference code is ${result.id}.`,
					date: date.toISOString(),
				});
			}
		} else {
			throw new HTTPBadRequestError(`Missing required fields: ${missing.join(', ')}`);
		}
	}
});
