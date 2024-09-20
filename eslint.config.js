import { frontmatter } from 'eslint-plugin-frontmatter2';
import { rules, languageOptions, ignoreFile } from '@shgysk8zer0/eslint-config';

const ignores = [
	'node_modules/',
	'.netlify/',
	'_site/',
	'**/*.min.js',
	'*.min.js',
];

export default [
	{ ignores: ignoreFile.ignores },
	{
		ignores: [...ignores, 'api/'],
		plugins: { frontmatter2: frontmatter },
		processor: 'frontmatter2/frontmatter',
		files: ['*.js', '**/*.js', '*.mjs', '**/*.mjs'],
		rules,
		linterOptions: { noInlineConfig: false },
		languageOptions: languageOptions.browser,
	}, {
		ignores,
		files: ['api/*.cjs','api/*.js', 'api/**/*.cjs', 'api/**/*.js'],
		rules,
		languageOptions: languageOptions.node,
	}
];
