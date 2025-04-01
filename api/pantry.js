import { createHandler, HTTPBadRequestError, HTTPForbiddenError, HTTPNotFoundError, HTTPUnauthorizedError } from '@shgysk8zer0/lambda-http';
import { addCollectionItem, deleteCollectionItem, getCollectionItem, getCollectionItems, getPublicKey } from './utils.js';
import { encrypt, decrypt, BASE64, getSecretKey } from '@shgysk8zer0/aes-gcm';
import { NO_CONTENT } from '@shgysk8zer0/consts/status.js';
import { verifyJWT } from '@shgysk8zer0/jwk-utils';
import {
	SlackMessage, SlackSectionBlock, SlackPlainTextElement, SlackMarkdownElement,
	SlackButtonElement, SlackHeaderBlock, SlackDividerBlock, SlackContextBlock,
	SlackActionsBlock, SLACK_PRIMARY,
} from '@shgysk8zer0/slack';

const FORMAT = {
	dateStyle: 'medium',
	timeStyle: 'short',
};

const COLLECTION = 'pantry-schedule';

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);
		const token = req.cookies.get('org-jwt');

		if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required token for request.');
		} else if (! searchParams.has('id')) {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const appts = await getCollectionItems(COLLECTION, {
					limit: 20,
					filters: [
						['date', '>', new Date()]
					]
				});

				return Response.json(appts.map(({ name, date, created, points, household}) => ({
					name,
					points,
					household,
					date: new Date(date._seconds * 1000).toISOString(),
					created: new Date(created._seconds * 1000),
				})));
			}
		} else  {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:get'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const appt = await getCollectionItem(COLLECTION, searchParams.get('id'));

				if (typeof appt !== 'object' || typeof appt.date === 'undefined') {
					throw new HTTPNotFoundError(`No results for id ${searchParams.get('id')}.`);
				} else if (appt instanceof Error) {
					throw appt;
				} else {
					const key = await getSecretKey();

					return Response.json({
						name: appt.name,
						points: appt.points,
						household: appt.household,
						addressLocality: appt.addressLocality,
						date: new Date(appt.date._seconds * 1000).toISOString(),
						telephone: typeof appt.telephone === 'string' ? await decrypt(key, appt.telephone, { input: 'base64', output: 'text' }) : null,
						email: typeof appt.email === 'string' ? await decrypt(key, appt.email, { input: 'base64', output: 'text' }) : null,
						comments: typeof appt.comments === 'string' ? await decrypt(key, appt.comments, { input: 'base64', output: 'text' }) : null,
					});
				}
			}
		}
	},
	async post(req) {
		const data = await req.formData();
		const missing = ['name', 'household', 'addressLocality', 'postalCode', 'date', 'time',].filter(field => ! data.has(field));

		if (missing.length === 0) {
			const key = await getSecretKey();
			const date = new Date(data.has('datetime') ? data.get('datetime') : `${data.get('date')}T${data.get('time')}`);
			const household = parseInt(data.get('household'));

			if (Number.isNaN(date.getTime())) {
				throw new HTTPBadRequestError('Invalid date/time given.');
			} else if (! Number.isSafeInteger(household) || household < 1 || household > 8) {
				throw new HTTPBadRequestError(`Invalid household size: ${data.get('household')}.`);
			} else {
				const [email = null, telephone = null, comments = null] = await Promise.all(
					['email', 'telephone', 'comments']
						.map(field => data.get(field) ?? null)
						.map(field => typeof field === 'string' && field.length !== 0 ? encrypt(key, field, { output: BASE64 }) : null)
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
	},

	async delete(req) {
		const { searchParams } = new URL(req.url);
		const token = req.cookies.get('org-jwt');

		if (! searchParams.has('id')) {
			throw new HTTPBadRequestError('Missing required id.');
		} else if (typeof token !== 'string' || token.length === 0) {
			throw new HTTPUnauthorizedError('Missing required token for request.');
		} else {
			const result = await verifyJWT(token, await getPublicKey(), {
				entitlements: ['pantry-schedule:delete'],
				roles: ['admin'],
			});

			if (result instanceof Error) {
				throw new HTTPForbiddenError('Invalid or expired token.', { cause: result });
			} else {
				const deleted = await deleteCollectionItem(COLLECTION, searchParams.get('id'));

				if (deleted) {
					return new Response(null, { status: NO_CONTENT });
				} else {
					throw new HTTPNotFoundError(`Nothing scheduled with id ${searchParams.get('id')}.`);
				}
			}
		}
	}
});
