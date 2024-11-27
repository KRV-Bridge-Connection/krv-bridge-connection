export default () => `<div class="status-box warn">
	<h2>Page Not Found</h2>
	<p>Sorry, but ${location.href} could not be found.</p>
	<p>If you arrived here by clicking a link on our site, please report the error.</p>
	<p>Return to our <a href="/">Home Page</p>
</div>`;

export const title = 'Page Not Found';

export const description = `Sorry, but ${location.href} does not seem to exist.`;
