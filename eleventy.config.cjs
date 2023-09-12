#!/usr/bin/env node
/* eslint-env node */
const { load } = require('js-yaml');
// const { readJSONFile } = require('@shgysk8zer0/npm-utils/json');
const filters = require('@shgysk8zer0/11ty-filters');
const { markdownIt } = require('@shgysk8zer0/11ty-netlify/markdown');
// const { importmap } = require('@shgysk8zer0/importmap');
const firebase = require('firebase-admin');
const { Liquid } = require('liquidjs');

async function getCollection(name, db) {
	const snapshot = await db.collection(name).get();
	const items = [];

	snapshot.forEach(doc => items.push(doc.data()));

	return items;
}


module.exports = function(eleventyConfig) {
	if (typeof process.env.FIREBASE_CERT !== 'string') {
		throw new Error('Missing FIREBASE_CERT in `process.env');
	} else if (firebase.apps.length === 0) {
		const cert = JSON.parse(atob(process.env.FIREBASE_CERT));
		firebase.initializeApp({
			credential: firebase.credential.cert(cert),
		});
	}

	const db = firebase.firestore();
	const liquid = new Liquid();

	eleventyConfig.addTemplateFormats('mjs');

	eleventyConfig.addExtension('mjs', {
		outputFileExtension: 'js', // optional, default: "html"
		compile: async (inputContent) => {
			const parsed = await liquid.parse(inputContent);

			return data => liquid.render(parsed, data);
		}
	});

	Object.entries(filters).forEach(([filter, cb]) => eleventyConfig.addFilter(filter, cb));
	eleventyConfig.addShortcode('firestore', async collection => {
		return getCollection(collection, db);
	});
	eleventyConfig.addFilter('trim', input => input.trim());
	eleventyConfig.addFilter('startsWith', function(string, prefix) {
		console.log({ string, prefix });
		return string.startsWith(prefix);
	});
	eleventyConfig.addFilter('time', input => new Date(`2000-01-01T${input}`).toLocaleTimeString());
	eleventyConfig.addFilter('is_icon', list => {
		return JSON.stringify(list.filter(icon => typeof icon.purpose === 'string'));
	});

	// Add `_data/*.yml` & `_data/*.yaml` parsing as data files
	eleventyConfig.addDataExtension('yaml', contents => load(contents));
	eleventyConfig.addDataExtension('yml', contents => load(contents));

	// These directories get copied to `_site/`
	eleventyConfig.addPassthroughCopy('js');
	eleventyConfig.addPassthroughCopy('css');
	eleventyConfig.addPassthroughCopy('img');
	eleventyConfig.addPassthroughCopy('_redirects');
	eleventyConfig.addPassthroughCopy('robots.txt');

	// Not including file extensions is slower, so alias theme
	eleventyConfig.addLayoutAlias('post', '11ty-layouts/post.html');
	eleventyConfig.addLayoutAlias('default', '11ty-layouts/default.html');

	eleventyConfig.setLibrary('md', markdownIt);

	// Set global data/variables
	// {{ environment }} -> 'production' | 'development'
	// eleventyConfig.addGlobalData('importmap', importmap);
	eleventyConfig.addGlobalData('firebase-orgs', getCollection('organizations', db));
	eleventyConfig.addGlobalData('environment',
		process.env.ELEVENTY_RUN_MODE === 'build'
			? 'production'
			: 'development'
	);

	// {% if dev %}
	eleventyConfig.addGlobalData('dev', process.env.ELEVENTY_RUN_MODE === 'build');

	return {
		dir: {
			// input: 'src',
			includes: '_includes',
			layouts: '_layouts',
			data: '_data',
			output: '_site',
			dynamicPartials: false,
			jekyllInclude: true,
			extname: '.html',
		}
	};
};
