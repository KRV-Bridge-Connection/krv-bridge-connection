module.exports = {
	layout: '11ty-layouts/post.html',
	permalink({ title, date, category }) {
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();

		return typeof category === 'string'
			? `posts/${this.slugify(category)}/${year}/${month}/${day}/${this.slugify(title)}/index.html`
			: `posts/${year}/${month}/${day}/${this.slugify(title)}/index.html`;
	},
};
