import { navigate as nav } from '@aegisjsproject/router';

export function createSVGFallbackLogo(text, {
	width = 300,
	height = 100,
	textColor = '#333',
	fill = '#fafafa',
	fontFamily = 'sans-serif',
	fontSize = 16,
	fontWeight = 400,
	borderRadius = 5,
	classList,
} = {}) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	svg.setAttribute('width', width);
	svg.setAttribute('height', height);
	svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
	rect.setAttribute('width', width);
	rect.setAttribute('height', height);
	rect.setAttribute('fill', fill);
	rect.setAttribute('x', 0);
	rect.setAttribute('y', 0);

	if (borderRadius !== 0) {
	  rect.setAttribute('rx', borderRadius);
	  rect.setAttribute('ry', borderRadius);
	}

	const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	textElement.setAttribute('fill', textColor);
	textElement.setAttribute('font-family', fontFamily);
	textElement.setAttribute('font-size', fontSize);
	textElement.setAttribute('font-weight', fontWeight);
	textElement.setAttribute('text-anchor', 'middle');

	svg.append(rect, textElement);

	if (Array.isArray(classList)) {
		svg.classList.add(...classList);
	} else if (typeof classList === 'string') {
		svg.classList.add(classList);
	}

	// Important: Append SVG to document body temporarily for text measurement
	document.body.appendChild(svg);

	// Calculate line breaks
	const words = text.split(' ');
	let lines = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;

		// Create test tspan for measurement
		const testTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
		testTspan.textContent = testLine;
		textElement.appendChild(testTspan);

		const textWidth = testTspan.getComputedTextLength();
		textElement.removeChild(testTspan);

		if (textWidth > width * 0.9 && currentLine !== '') {
			lines.push(currentLine);
			currentLine = word;
	  	} else {
			currentLine = testLine;
		}
	}

	if (currentLine !== '') {
	  lines.push(currentLine);
	}

	// Clear text element
	textElement.replaceChildren();

	// Calculate total height
	const lineHeight = fontSize * 1.2;
	const totalTextHeight = lines.length * lineHeight;

	// Calculate starting Y position for vertical centering
	// let startY = (height / 2) - ((totalTextHeight / 2) - (lineHeight / 2));
	const startY = (height / 2) - (totalTextHeight / 2) + (fontSize * 0.8);

	// Create tspans for each line
	lines.forEach((line, index) => {
	  const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
	  tspan.setAttribute('x', width / 2);
	  tspan.setAttribute('y', startY + (index * lineHeight));
	  tspan.textContent = line;
	  textElement.appendChild(tspan);
	});

	// Remove from document body
	document.body.removeChild(svg);

	return svg;
}

export function navigate(pathname, params = {}) {
	const url = new URL(pathname, `${location.origin}${location.pathname}`);

	if (url.origin !== location.origin) {
		throw new Error(`Disallowed origin: ${url.origin}`);
	} else {
		Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
		nav(url);
	}
}

export function redirect(params = {}) {
	const search = new URLSearchParams(location.search);
	const pathname = search.get('redirect') || '/';
	navigate(pathname, params);
}

export async function login() {
	const HTMLFirebaseSignInElement = await customElements.whenDefined('firebase-sign-in');
	const user = await HTMLFirebaseSignInElement.asDialog();
	return user;
}

export async function getOrgJWT(user, { signal } = {}) {
	if (signal instanceof AbortSignal && signal.aborted) {
		throw signal.reason;
	} else if (user?.getIdToken instanceof Function) {
		const token = await user.getIdToken();

		const resp = await fetch('/api/orgJWT', {
			headers: { Authorization: `Bearer ${token}` },
			credentials: 'include',
			referrerPolicy: 'no-referrer',
			signal,
		});

		if (resp.ok) {
			const { jti, expires } = await resp.json();
			return { tokenId: jti, expires: new Date(expires) };
		} else if (resp.headers.get('Content-Type').startsWith('application/json')) {
			const { error } = await resp.json();
			throw new Error(error.message);
		} else {
			throw new DOMException(`${resp.url} [${resp.status} ${resp.statusText}]`, 'NetworkError');
		}
	} else {
		throw new TypeError('Invalid user object.');
	}
}
