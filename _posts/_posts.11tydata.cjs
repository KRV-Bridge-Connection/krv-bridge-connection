module.exports = {
	layout: '11ty-layouts/post.html',
	permalink({ title, date, category, page }) {
		const actualDate = new Date((date ?? page.date).getTime());

		// Handle midnight in UTC
		if (date.getHours() !== 0 && date.getTimezoneOffset() > 0) {
			actualDate.setDate(date.getDate() + 1);
		}

		const year = actualDate.getFullYear();
		const month = actualDate.getMonth() + 1;
		const day = actualDate.getDate();

		return typeof category === 'string'
			? `posts/${this.slugify(category)}/${year}/${month}/${day}/${this.slugify(title)}/index.html`
			: `posts/${year}/${month}/${day}/${this.slugify(title)}/index.html`;
	},
};
