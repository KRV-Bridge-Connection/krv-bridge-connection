import js from '@eslint/js';
import globals from 'globals';
import { frontmatter } from 'eslint-plugin-frontmatter2';

const rules = {
	...js.configs.recommended.rules,
	'indent': [2, 'tab', { 'SwitchCase': 1 }],
	'quotes': [2, 'single'],
	'semi': [2, 'always'],
	'no-console': 0,
	'no-async-promise-executor': 0,
	'no-prototype-builtins': 0,
	'no-unused-vars': 'error',
};

export default [
	{
		ignores: [
			'node_modules/',
			'.netlify/',
			'_site/',
			'**/*.min.js',
			'*.min.js',
		],
	}, {
		plugins: { frontmatter2: frontmatter },
		processor: 'frontmatter2/frontmatter',
		files: ['*.js', '**/*.js', '*.mjs', '**/*.mjs'],
		rules,
		linterOptions: {
			noInlineConfig: false
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				globalThis: 'readonly',
				trustedTypes: 'readonly',
				cookieStore: 'readonly',
				scheduler: 'readonly',
				PasswordCredential: 'readonly',
				process: 'readonly',
				...globals.browser,
			}
		}
	}, {
		files: ['api/*.cjs','api/*.js', 'api/**/*.cjs', 'api/**/*.js'],
		rules,
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node,
		}
	}
];
