import { html } from '@aegisjsproject/core/parsers/html.js';
import { css } from '@aegisjsproject/core/parsers/css.js';
import { onSubmit, signal as sig } from '@aegisjsproject/callback-registry/events.js';

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
			img.decode().finally(() => URL.revokeObjectURL(img.src));
			img.popover = 'auto';
			img.addEventListener('toggle', ({ target, newState }) => {
				if (newState === 'closed') {
					target.remove();
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
}}" ${sig}="${signal}">
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
<button type="button" class="btn btn-primary" command="show-popover" commandfor="jwid">Show Form</button>`;

export const styles = css`#jwid:popover-open {
	max-height: 95dvh;
	width: min(600px, 90dvw);
	overflow: auto;
}`;

export const title = 'JWID Form';
export const description = 'Create cryptographically signed ID tokens via QR codes.';
