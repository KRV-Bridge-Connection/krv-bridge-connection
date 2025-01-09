import { html } from '@aegisjsproject/core/parsers/html.js';
import { site } from '../consts.js';

const cache = new Map();
const dateOptions = { weekday: 'short', month: 'short', year: 'numeric', day: 'numeric' };

async function getPost({
	pathname: {
		groups: { year, month, day, post }
	},
}, signal) {
	const id = `${year}-${month}-${day}:${post}`;

	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (cache.has(id)) {
		return cache.get(id);
	} else {
		const { promise, resolve, reject } = Promise.withResolvers();
		cache.set(id, promise);
		console.log(`Caching & fetching ${id}`);

		const url = new URL(`/api/posts`, location.origin);
		url.searchParams.set('id', `${year}-${month}-${day}:${post}`);

		const resp = await fetch(url, {
			headers: { Accept: 'application/json' },
			referrerPolicy: 'origin',
			credentials: 'omit',
			signal,
		}).catch(err => err);

		if (resp instanceof Error) {
			reject(err);
		} else if (! resp.ok) {
			reject(new DOMException(`${resp.url} [${resp.status} ${resp.statusText}]`, 'NetworkError'));
		} else {
			const data = await resp.json();
			data.createdAt = new Date(data.createdAt._seconds * 1000);
			cache.set(id, data);
			resolve(data);
		}

		return promise;
	}
}


export default async ({ matches, signal }) => {
	try {
		const { title, content, author, createdAt, image = 'https://cdn.kernvalley.us/img/raster/missing-image.png' } = await getPost(matches, signal);

		return html`<article itemtype="https://schema.org/Article" itemscope="">
			<header>
				<h2 itemprop="headline">${title}</h2>
				<div itemprop="author" itemtype="https://schema.org/Person" itemscope="">
					<img src="${author.picture}" itemprop="image" crossorigin="anonymous" referrerpolicy="no-referrer" alt="${author.name} Profile Image" width="64" height="64" />
					<b itemprop="name">${author.name}</b>
					<meta itemprop="url" content="/orgs/user/${author.sub}" />
				</div>
			</header>
			<div><img src="${image}" itemprop="image" crossorigin="anonymous" referrerpolicy="no-referrer" loading="lazy" alt="" /></div>
			<section itemprop="articleBody">${content}</section>
			<footer>
				<p>
					<span>First posted on</span>
					<time itemprop="dateCreated" datetime="${createdAt.toISOString()}">${createdAt.toLocaleDateString(navigator.language, dateOptions)}</time>
				</p>
			</footer>
		</article>`;
	} catch(err) {
		return html`<div class="status-box error">${err.message}</div>`;
	}
};

export const title = async ({ matches, signal }) => await getPost(matches, signal)
	.then(post => post.title)
	.catch(() => 'Not Found') + ' | ' + site.title;

export const description = async ({ matches, signal }) => await getPost(matches, signal)
	.then(post => post.description)
	.catch(() => 'Post not found');
