import postcssImport from '@shgysk8zer0/postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import pcDiscardComments from 'postcss-discard-comments';
import pcCustomProperties from 'postcss-custom-properties';
import pcMediaMinMax from 'postcss-media-minmax';
import CSSNano from 'cssnano';
import postcssNesting  from 'postcss-nesting';

export const plugins = [
	postcssImport, postcssPresetEnv({
		features: {
			'cascade-layers': false
		}
	}), pcDiscardComments, pcCustomProperties,
	pcMediaMinMax, CSSNano, postcssNesting,
];

export default { map: { inline: false }, plugins };
