/**
 * Registers the slider and slide blocks in the editor (the slide block has
 * no editor script of its own). Attributes and supports come from the
 * block.json files; both blocks are rendered by PHP (includes/class-render.php)
 * and save only their inner blocks.
 */
import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import sliderMetadata from './block.json';
import slideMetadata from '../slide/block.json';
import SliderEdit from './edit';
import SlideEdit from '../slide/edit';
import transforms from './transforms';
import sliderDeprecated from '../../legacy/slider-deprecated';
import slideDeprecated from '../../legacy/slide-deprecated';
import icons from '../icons';
import './editor.scss';
import './style.scss';

const save = () => <InnerBlocks.Content />;

// The inserter's preview: gradients, no remote images.
const exampleSlide = ( gradient, text ) => ( {
	name: slideMetadata.name,
	attributes: {
		contentPosition: 'center center',
		background: {
			backgroundType: 'gradient',
			backgroundGradient: gradient,
		},
	},
	innerBlocks: [
		{
			name: 'core/heading',
			attributes: {
				content: text,
				textAlign: 'center',
				style: { color: { text: '#ffffff' } },
			},
		},
	],
} );

registerBlockType( sliderMetadata.name, {
	...sliderMetadata,
	icon: icons.gutenslider,
	edit: SliderEdit,
	save,
	deprecated: sliderDeprecated,
	transforms,
	example: {
		attributes: {
			sliderHeight: '220px',
			sliderHeightMd: '220px',
			sliderHeightSm: '220px',
			arrows: true,
			dots: true,
		},
		innerBlocks: [
			exampleSlide(
				'linear-gradient(135deg,#0f766e 0%,#22d3ee 100%)',
				__( 'Slides with any blocks on top', 'gutenslider' )
			),
			exampleSlide(
				'linear-gradient(135deg,#7c3aed 0%,#f472b6 100%)',
				__( 'Images and videos', 'gutenslider' )
			),
		],
	},
} );

registerBlockType( slideMetadata.name, {
	...slideMetadata,
	icon: icons.gutenslide,
	edit: SlideEdit,
	save,
	deprecated: slideDeprecated,
} );
