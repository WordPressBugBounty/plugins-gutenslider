/**
 * Transforms: gallery, images and cover into a slider; slider into a gallery.
 */
import { createBlock } from '@wordpress/blocks';
import { applyFilters } from '@wordpress/hooks';

import { newSlide } from './edit';

const SLIDER = 'eedee/block-gutenslider';

const imageToSlide = ( { id, url, alt, width, height } ) =>
	newSlide( { id, url, alt, width, height, type: 'image' } );

export default {
	from: [
		{
			type: 'block',
			blocks: [ 'core/gallery' ],
			transform: ( attributes, innerBlocks ) =>
				createBlock(
					SLIDER,
					{ contentMode: 'change', animation: 'slide' },
					innerBlocks
						.filter(
							( b ) => b.name === 'core/image' && b.attributes.url
						)
						.map( ( b ) => imageToSlide( b.attributes ) )
				),
		},
		{
			type: 'block',
			blocks: [ 'core/image' ],
			isMultiBlock: true,
			isMatch: ( list ) =>
				list.every( ( attributes ) => !! attributes.url ),
			transform: ( list ) =>
				createBlock(
					SLIDER,
					{ contentMode: 'change', animation: 'slide' },
					list.map( imageToSlide )
				),
		},
		{
			type: 'block',
			blocks: [ 'core/cover' ],
			transform: ( attributes, innerBlocks ) => {
				const {
					id,
					url,
					align,
					minHeight,
					minHeightUnit,
					focalPoint,
					backgroundType,
				} = attributes;
				const sliderHeight = `${ minHeight || 50 }${ minHeightUnit || 'vh' }`;
				const slide = url
					? newSlide( {
							id,
							url,
							type:
								backgroundType === 'video' ? 'video' : 'image',
						} )
					: newSlide( null );
				if ( focalPoint ) {
					slide.attributes.background.backgroundFocalPoint =
						focalPoint;
					slide.attributes.background.backgroundVideoFocalPoint =
						focalPoint;
				}
				slide.innerBlocks = [];
				return createBlock(
					SLIDER,
					// Another plugin may carry more of the cover over.
					applyFilters(
						'gutenslider.slider.fromCover',
						{
							contentMode: 'fixed',
							align,
							animation: 'fade',
							sliderHeight,
							sliderHeightMd: sliderHeight,
							sliderHeightSm: sliderHeight,
						},
						attributes
					),
					[ slide, ...innerBlocks ]
				);
			},
		},
	],
	to: [
		{
			type: 'block',
			blocks: [ 'core/gallery' ],
			transform: ( attributes, innerBlocks ) =>
				createBlock(
					'core/gallery',
					{},
					innerBlocks
						.filter(
							( b ) =>
								b.attributes.background?.backgroundType ===
									'image' &&
								b.attributes.background.backgroundImage?.url
						)
						.map( ( b ) => {
							const { id, url, alt } =
								b.attributes.background.backgroundImage;
							return createBlock( 'core/image', {
								id,
								url,
								alt,
							} );
						} )
				),
		},
	],
};
