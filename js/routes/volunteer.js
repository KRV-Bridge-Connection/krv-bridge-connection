const SRC = '/docs/volunteer.pdf';
const PDF_ID = 'volunteer-pdf';

const sheet = new CSSStyleSheet();
sheet.replace(`#${PDF_ID} {
	width: 100%;
	height: auto;
	display: block;
	aspect-ratio: 17 / 22; /* US Legal */
}`);

export default () => `<a href="${SRC}" download="krv-bridge-connection-volunteer.pdf" class="block">
	<iframe src="${SRC}" sandbox="allow-scripts allow-downloads" id="${PDF_ID}" class="full-width"></iframe>
</a>`;

export const styles = [sheet];
