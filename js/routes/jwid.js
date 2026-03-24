import { html, el } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { onSubmit, onCommand, onClose, signal as sig } from '@aegisjsproject/callback-registry/events.js';
import { createBarcodeScanner, preloadRxing, QR_CODE } from '@aegisjsproject/barcodescanner';
import { verifyJWT } from '@shgysk8zer0/jwk-utils/jwt.js';
import { importJWK } from '@shgysk8zer0/jwk-utils/jwk.js';
import keyData from '../../js/jwk.json' with { type: 'json' };

const handleError = globalThis.reportError;

const JWT_PATTERN = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/;

async function showScanner() {
	const { resolve, promise } = Promise.withResolvers();
	const stack = new AsyncDisposableStack();
	const controller = stack.adopt(new AbortController(), c => c.abort(new DOMException('Disposed', 'AbortError')));

	const dialog = stack.adopt(document.getElementById('jwid-scanner'), el => el.close());
	dialog.addEventListener('close', () => resolve(), { once: true, signal: controller.signal });
	const publicKey = await importJWK(keyData);

	await createBarcodeScanner(async ({ rawValue, format }) => {
		if (format === QR_CODE && typeof rawValue === 'string' && JWT_PATTERN.test(rawValue)) {
			const payload = await verifyJWT(rawValue, publicKey, {
				claims: ['given_name', 'family_name', 'iss', 'birthdate'],
			}).catch(err => err);

			if (payload instanceof Error) {
				handleError(payload);
			} else {
				const { promise, resolve } = Promise.withResolvers();
				const {
					iss: issuer,
					sub_id: identifier = crypto.randomUUID(),
					given_name: givenName,
					family_name: familyName,
					phone_number: telephone,
					birthdate: birthDate,
					email,
					picture: image = 'https://cdn.kernvalley.us/img/raster/missing-image.svg',
					address: {
						street_address: streetAddress,
						locality: addressLocality,
					} = {}
				} = payload;

				const modal = stack.adopt(el`<dialog id="_${identifier}-modal" class="jwid-result-dialog" ${onClose}="${({ target }) => {
					target.remove();
					resolve();
					dialog.close();
				}}">
					<div class="jwid-result-card">
						<header class="jwid-result-header flex row">
							<img src="${image}" alt="${givenName} ${familyName}" class="jwid-result-avatar" loading="lazy" crossorigin="anonymous">
							<div class="jwid-result-heading">
								<strong class="jwid-result-name">${givenName} ${familyName}</strong>
								<div>
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" fill="currentColor" class="icon" viewBox="0 0 14 16" role="presentation" aria-label="Birth Date">
										<path fill-rule="evenodd" d="M13 2h-1v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H6v1.5c0 .28-.22.5-.5.5h-2c-.28 0-.5-.22-.5-.5V2H2c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm0 12H2V5h11v9zM5 3H4V1h1v2zm6 0h-1V1h1v2zM6 7H5V6h1v1zm2 0H7V6h1v1zm2 0H9V6h1v1zm2 0h-1V6h1v1zM4 9H3V8h1v1zm2 0H5V8h1v1zm2 0H7V8h1v1zm2 0H9V8h1v1zm2 0h-1V8h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1zm2 0h-1v-1h1v1zm-8 2H3v-1h1v1zm2 0H5v-1h1v1zm2 0H7v-1h1v1zm2 0H9v-1h1v1z"/>
									</svg>
									<time class="jwid-result-value" datetime="${birthDate}">${new Date(birthDate + 'T00:00').toLocaleDateString(navigator.language, { dateStyle: 'long' })}</time>
								</div>
							</div>
						</header>
						<div class="jwid-result-body">
							${email ? `
								<div class="jwid-result-row">
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" fill="currentColor" class="icon" viewBox="0 0 14 16" role="presentation" aria-label="Email">
										<path fill-rule="evenodd" d="M0 4v8c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H1c-.55 0-1 .45-1 1zm13 0L7 9 1 4h12zM1 5.5l4 3-4 3v-6zM2 12l3.5-3L7 10.5 8.5 9l3.5 3H2zm11-.5l-4-3 4-3v6z"/>
									</svg>

									<a href="mailto:${email}" class="jwid-result-value">${email}</a>
								</div>
							` : ''}

							${telephone ? `
								<div class="jwid-result-row">
									<svg xmlns="http://www.w3.org/2000/svg" width="17.067" height="17.067" class="icon" fill="currentColor" viewBox="0 0 16 16" role="presentation" aria-label="Telephone">
										<path d="M13.032 1c.534 0 .969.427.969.969v.062c-.017 6.613-5.383 11.97-12 11.97H1.97c-.545 0-.97-.447-.97-1v-3c0-.555.447-1 1-1h2c.555 0 1 .445 1 1v.468A8.967 8.967 0 0 0 10.47 5H10c-.553 0-1-.446-1-1V2c0-.554.447-1 1-1h3.032z"/>
									</svg>
									<a href="tel:${telephone}" class="jwid-result-value">${telephone}</a>
								</div>
							` : ''}

							${(streetAddress || addressLocality) ? `
								<div class="jwid-result-row">
									<svg xmlns="http://www.w3.org/2000/svg" width="17.067" height="17.07" class="icon" viewBox="0 0 16 16.003" fill="currentColor" role="presentation" aria-label="Address">
										<path d="M8 0a5 5 0 0 0-5 5c0 .173.014.332.031.5.014.167.036.336.063.5C3.666 9.514 6 12.003 8 14.003c2-2 4.334-4.489 4.906-8.003a6.38 6.38 0 0 0 .063-.5c.017-.168.03-.327.03-.5a5 5 0 0 0-5-5zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" solid-color="#000000"/>
									</svg>
									<span class="jwid-result-value">${
										streetAddress ?? ''
									}${streetAddress && addressLocality ? ', ' : ''}${
										addressLocality ?? ''
									}</span>
								</div>
							` : ''}
						</div>

						<footer class="jwid-result-footer">
							${URL.canParse(issuer) ? `
								<div class="jwid-result-row">
									<svg xmlns="http://www.w3.org/2000/svg" width="15" height="20" viewBox="0 0 12 16" fill="#0f0" aria-label="Verified Issuer"">
										<path fill-rule="evenodd" d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"/>
									</svg>
									<a href="${issuer}" rel="noopener noreferrer external" target="_blank">${new URL(issuer).hostname}</a>
								</div>
							` : ''}
							<button type="button" class="btn btn-danger" command="request-close" commandfor="_${identifier}-modal">Close</button>
						</footer>
					</div>
				</dialog>`, d => d.remove());

				document.body.append(modal);
				modal.showModal();
				await promise;
				dialog.close();
			}
		}
	}, {
		video: 'jwid-preview',
		formats: [QR_CODE],
		signal: controller.signal,
	});

	dialog.showModal();
	await promise;
	stack.disposeAsync();
}

preloadRxing();

/* eslint indent: off */
export default ({ signal }) => html`<form id="jwid" popover="manual" ${onSubmit}="${async event => {
	const { submitter, target } = event;
	event.preventDefault();

	try {
		submitter.disabled = true;
		const { resolve, promise } = Promise.withResolvers();
		const data = new FormData(target);
		const img = document.createElement('img');
		const resp = await fetch('/api/jwid', {
			method: 'POST',
			body: data,
		});

		if (resp.ok) {
			img.src = URL.createObjectURL(await resp.blob());
			img.popover = 'auto';
			img.addEventListener('toggle', ({ target, newState }) => {
				if (newState === 'closed') {
					target.remove();
					URL.revokeObjectURL(img.src);
					resolve();
				}
			});

			document.body.append(img);
			img.showPopover();
			await promise;
			target.reset();
		} else {
			throw new DOMException(`<${resp.url}> [${resp.status}]`, 'NetworkError');
		}

	} finally {
		submitter.disabled = false;
	}
}}"
	${onCommand}="${async({ source, command }) => {
		source.disabled = true;

		try {
			switch(command) {
				case '--scan':
					await showScanner();
					break;
			}
		} catch(err) {
			handleError(err);
		} finally {
			source.disabled = false;
		}
	}}"
	${sig}="${signal}">
    <div class="form-group">
        <label class="input-label" for="identifier">Identifier</label>
        <input class="input" type="text" id="identifier" name="identifier">
    </div>

    <div class="form-group">
        <label class="input-label" for="url">URL</label>
        <input class="input" type="url" id="url" name="url" autocomplete="url">
    </div>

    <div class="form-group">
        <label class="input-label" for="honorificPrefix">Honorific Prefix</label>
        <input class="input" type="text" id="honorificPrefix" name="honorificPrefix" autocomplete="honorific-prefix">
    </div>

    <div class="form-group">
        <label class="input-label" for="givenName">Given Name</label>
        <input class="input" type="text" id="givenName" name="givenName" autocomplete="given-name" required>
    </div>

    <div class="form-group">
        <label class="input-label" for="additionalName">Additional Name</label>
        <input class="input" type="text" id="additionalName" name="additionalName" autocomplete="additional-name">
    </div>

    <div class="form-group">
        <label class="input-label" for="familyName">Family Name</label>
        <input class="input" type="text" id="familyName" name="familyName" autocomplete="family-name" required>
    </div>

    <div class="form-group">
        <label class="input-label" for="honorificSuffix">Honorific Suffix</label>
        <input class="input" type="text" id="honorificSuffix" name="honorificSuffix" autocomplete="honorific-suffix">
    </div>

    <div class="form-group">
        <label class="input-label" for="gender">Gender</label>
        <input class="input" type="text" id="gender" name="gender" autocomplete="sex" list="genders" required>
        <datalist id="genders">
            <option value="male"></option>
            <option value="female"></option>
            <option value="non-binary"></option>
        </datalist>
    </div>

    <div class="form-group">
        <label class="input-label" for="nationality">Nationality</label>
        <input class="input" type="text" id="nationality" name="nationality" list="nationalities">
        <datalist id="nationalities">
            <option value="US"></option>
            <option value="CA"></option>
            <option value="GB"></option>
            <option value="AU"></option>
        </datalist>
    </div>

    <div class="form-group">
        <label class="input-label" for="email">Email</label>
        <input class="input" type="email" id="email" name="email" autocomplete="email">
    </div>

    <div class="form-group">
        <label class="input-label" for="telephone">Telephone</label>
        <input class="input" type="tel" id="telephone" name="telephone" autocomplete="tel">
    </div>

    <div class="form-group">
        <label class="input-label" for="image">Image URL</label>
        <input class="input" type="url" id="image" name="image" autocomplete="photo">
    </div>

    <fieldset>
        <legend>Address</legend>

        <div class="form-group">
            <label class="input-label" for="streetAddress">Street Address</label>
            <input class="input" type="text" id="streetAddress" name="address[streetAddress]" autocomplete="street-address">
        </div>

        <div class="form-group">
            <label class="input-label" for="addressLocality">Locality</label>
            <input class="input" type="text" id="addressLocality" name="address[addressLocality]" autocomplete="address-level2">
        </div>

        <div class="form-group">
            <label class="input-label" for="addressRegion">Region</label>
            <input class="input" type="text" id="addressRegion" name="address[addressRegion]" autocomplete="address-level1">
        </div>

        <div class="form-group">
            <label class="input-label" for="postalCode">Postal Code</label>
            <input class="input" type="text" id="postalCode" name="address[postalCode]" autocomplete="postal-code">
        </div>

        <div class="form-group">
            <label class="input-label" for="addressCountry">Country</label>
            <input class="input" type="text" id="addressCountry" name="address[addressCountry]" autocomplete="country">
        </div>
    </fieldset>

    <div class="form-group">
        <label class="input-label" for="birthDate">Birth Date</label>
        <input class="input" type="date" id="birthDate" name="birthDate" autocomplete="bday" required>
    </div>
		<div class="flex row btns">
			<button type="submit" class="btn btn-success">Submit</button>
			<button type="reset" class="btn btn-danger">Reset</button>
			<button type="button" class="btn btn-warning" command="hide-popover" commandfor="jwid">Close</button>
	</div>
</form>
<button type="button" class="btn btn-primary" command="show-popover" commandfor="jwid">Show Form</button>
<button type="button" class="btn btn-secondary" command="--scan" commandfor="jwid">Open Scanner</button>
<dialog id="jwid-scanner">
	<video id="jwid-preview"></video>
	<button type="button" class="btn btn-danger" command="request-close" commandfor="jwid-scanner">Close</button>
</dialog>`;

export const styles = [
	css`#jwid:popover-open {
		max-height: 95dvh;
		width: min(600px, 90dvw);
		overflow: auto;
	}`,
	css`.jwid-result-dialog {
		padding: 0;
		border: none;
		width: min(640px, 95%);
		border-radius: 6px;

		&::backdrop {
			background: rgb(0 0 0 / 0.5);
			backdrop-filter: blur(2px);
		}

		.jwid-result-card {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			padding: 1.25rem;
			border-radius: 0.75rem;
			box-shadow:
				0 10px 25px rgb(0 0 0 / 0.2),
				0 2px 6px rgb(0 0 0 / 0.1);
		}

		.jwid-result-header {
			align-items: center;
			gap: 1rem;

			.jwid-result-avatar {
				width: 128px;
				height: 128px;
				border-radius: 50%;
				object-fit: cover;
				flex-shrink: 0;
			}

			.jwid-result-heading {
				display: flex;
				flex-direction: column;
				justify-content: center;

				.jwid-result-name {
					font-size: 1.1rem;
					line-height: 1.2;
				}
			}
		}

		.jwid-result-body {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			.jwid-result-row {
				display: grid;
				grid-template-columns: auto 1fr;
				gap: 0.5rem 0.75rem;
				align-items: baseline;

				.jwid-result-label {
					font-size: 0.8rem;
					text-transform: uppercase;
					letter-spacing: 0.04em;
				}

				.jwid-result-value {
					overflow-wrap: anywhere;
				}

				a.jwid-result-value {
					text-decoration: none;

					&:hover {
						text-decoration: underline;
					}
				}
			}
		}

		.jwid-result-footer {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			margin-top: 0.5rem;

			.jwid-result-row {
				font-size: 0.8rem;

				a {
					color: inherit;
					text-decoration: underline;
				}
			}

			button {
				align-self: flex-end;
			}
		}
	}`,
];

export const title = 'JWID Form';
export const description = 'Create cryptographically signed ID tokens via QR codes.';
