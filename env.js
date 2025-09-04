import '@shgysk8zer0/polyfills';
import { succeed, fail, NONE } from '@aegisjsproject/attempt';
import { decrypt, encrypt, TEXT, BASE64 } from '@shgysk8zer0/aes-gcm';

/**
 *
 * @param {CryptoKey} key
 * @returns {[Proxy, (prop, val) => Promise<[boolean, null, true]|[null, err, false]>]}
 */
export function useSecretStore(key, targetObject = globalThis.process?.env ?? {}) {
	if (! (key instanceof CryptoKey && key.usages.includes('decrypt'))) {
		throw new TypeError('Key must be a `CryptoKey` with usages that include `"decrypt"`.');
	} else {
		const proxy =  new Proxy(targetObject, {
			get(target, property) {
				try {
					const encrypted = Reflect.get(target, property);

					if (typeof encrypted === 'string') {
						return decrypt(key, encrypted, { output: TEXT, input: BASE64 }).then(succeed, fail);
					} else {
						return succeed(NONE);
					}
				} catch(err) {
					return fail(err);
				}
			},
			has(target, property) {
				return Reflect.has(target, property);
			},
			ownKeys(target) {
				return Reflect.ownKeys(target);
			},
			async defineProperty(target, property, {
				value,
				enumerable,
				configurable,
				writable,
				get,
				set,
			}) {
				if ([enumerable, configurable, writable, get, set].some(prop => typeof prop !== 'undefined')) {
					// This is just a proxy to an unknown source
					fail(new TypeError('Cannot set extended atttributes when defining property descriptor.'));
				} else {
					const encrypted = await encrypt(key, value, { output: BASE64 });
					return Reflect.defineProperty(target, property, { value: encrypted });
				}
			}
		});

		const setter = key.usages.includes('encrypt')
			? async (property, value) => {
				try {
					const encrypted = await encrypt(key, value, { output: BASE64 });
					return succeed(Reflect.set(targetObject, property, encrypted));
				} catch(err) {
					return fail(err);
				}
			}
			: () => fail(new TypeError('Provided key does not support encryption.'));

		return Object.freeze([proxy, setter]);
	}
}
