import { html } from '@aegisjsproject/core/parsers/html.js';
import { attr } from '@aegisjsproject/core/stringify.js';
import { site, SCHEMA } from '../consts.js';
import { md } from '@aegisjsproject/markdown';
import { getItem, putItem, openDB } from '@aegisjsproject/idb';

const cache = new Map();
const STORE_NAME = 'posts';

async function _getPost(url, { signal } = {}) {
	const { resolve, reject, promise } = Promise.withResolvers();

	try {
		if (cache.has(url)) {
			resolve(cache.get(url));
		} else {
			cache.set(url, promise);
			const db = await openDB(SCHEMA.name, { version: SCHEMA.version, schema: SCHEMA });
			const post = await getItem(db, STORE_NAME, url, { signal });

			if (typeof post === 'object') {
				resolve(post);
			} else {
				const resp = await fetch(url, {
					headers: { Accept: 'application/json' },
					referrerPolicy: 'origin',
					credentials: 'omit',
					signal,
				}).catch(err => {
					reportError(err);
					return Response.error();
				});

				if (resp.ok) {
					const data = await resp.json();
					data.url = url;
					// export async function addItem(db, storeName, value, { durability = 'default', key, signal } = {})
					// console.log({ db, STORE_NAME, data, signal });
					data.created = new Date(data.created);
					data.updated = new Date(data.updated);
					await putItem(db, STORE_NAME, data, { signal }).catch(err => reportError(err));
					resolve(data);
				} else {
					reject(new Error(`${resp.url} [${resp.status}]`));
				}
			}
		}
	} catch(err) {
		reject(err);
	}

	return promise;
}

const dateOptions = { weekday: 'short', month: 'short', year: 'numeric', day: 'numeric' };

const _getData = ({
	pathname: {
		groups: { year, month, day, post } = {}
	} = {}
} = {}) => ({ year, month, day, post });

async function getPost({ year, month, day, post }, signal) {
	const id = `${year}-${month}-${day}:${post}`;

	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (cache.has(id)) {
		return cache.get(id);
	} else {
		const url = new URL('/api/posts', location.origin);
		url.searchParams.set('id', `${year}-${month}-${day}:${post}`);
		return await _getPost(url.href, { signal });
	}
}

export default async ({
	url,
	signal,
	params: { year, month, day, post } = {},
	...rest
}) => {
	try {
		console.log(rest);
		const {
			title, description, content, created,
			author: {
				name = 'Missing Author',
				picture = 'https://secure.gravatar.com/avatar/958bb1ce39fb68df75895c76b9ed5011?s=64&d=mm',
				sub = '',
			} = {},
			image: {
				src = 'https://cdn.kernvalley.us/img/raster/missing-image.png',
				width = 640,
				height = 480,
				alt = '',
			} = {}
		 } = await getPost({ year, month, day, post }, signal);

		const result = html`<section itemtype="https://schema.org/Article" itemscope="">
		 	<article>Test</article>
			<header>
		 		<meta itemprop="url" content="${url}" />
				<h2 itemprop="headline">${title}</h2>
				<meta itemprop="description" ${attr({ content: description })} />
				<div itemprop="author" itemtype="https://schema.org/Person" itemscope="">
					<img src="${picture}" itemprop="image" crossorigin="anonymous" referrerpolicy="no-referrer" alt="${name} Profile Image" width="64" height="64" />
					<b itemprop="name">${name}</b>
					<meta itemprop="url" content="/orgs/user/${sub}" />
				</div>
			</header>
			<figure itemprop="image" itemtype="https://schema.org/ImageObject" itemscope="">
				<img itemprop="url" crossorigin="anonymous" referrerpolicy="no-referrer" loading="lazy" ${attr({ src, alt, height, width })} />
				<meta itemprop="height" ${attr({ content: height })} />
				<meta itemprop="width" ${attr({ content: width })} />
				<figcaption itemprop="description">${alt}</figcaption>
			</figure>
			<section itemprop="articleBody">${md`${content}`}</section>
			<footer>
				<span>First posted on</span>
				<time itemprop="dateCreated" datetime="${created.toISOString()}">${created.toLocaleDateString(navigator.language, dateOptions)}</time>
			</footer>
		</section>`;

		console.log({ result });
		return result;
	} catch(err) {
		return html`<div class="status-box error">${err.message}</div>`;
	}
};

export const title = async ({ matches, signal }) => await getPost(_getData(matches), signal)
	.then(post => post.title)
	.catch(() => 'Not Found') + ' | ' + site.title;

export const description = async ({ matches, signal }) => await getPost(_getData(matches), signal)
	.then(post => post.description)
	.catch(() => 'Post not found');
