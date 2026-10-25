/**
 * "Captions from the Media Library": a paragraph with the image's texts in
 * each image slide (class `eedee-gutenslider-autocaption`, as 6.x made it).
 *
 * Runs only when the setting changes; 6.x rewrote them on every load.
 */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
import { resolveSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';

export const CAPTION_STYLES = [
	{ value: 'none', label: __( 'None', 'gutenslider' ) },
	{ value: 'caption-only', label: __( 'Caption', 'gutenslider' ) },
	{ value: 'title-caption', label: __( 'Title – caption', 'gutenslider' ) },
	{
		value: 'title-caption-description',
		label: __( 'Title – caption – description', 'gutenslider' ),
	},
];

const CLASS = 'eedee-gutenslider-autocaption';

const text = ( html ) => {
	const div = document.createElement( 'div' );
	div.innerHTML = html || '';
	return div.textContent.trim();
};

/**
 * The caption text of an image for a style.
 *
 * @param {number} id    Attachment ID.
 * @param {string} style Caption style.
 * @return {Promise<string>} Text ('' for none).
 */
async function captionOf( id, style ) {
	if ( ! id || style === 'none' ) {
		return '';
	}
	const media = await resolveSelect( coreStore )
		.getMedia( id, { context: 'view' } )
		.catch( () => null );
	if ( ! media ) {
		return '';
	}
	const caption = text( media.caption?.rendered );
	const title = text( media.title?.rendered );
	const description = text( media.description?.rendered );
	const parts =
		{
			'caption-only': [ caption ],
			'title-caption': [ title, caption ],
			'title-caption-description': [ title, caption, description ],
		}[ style ] || [];
	return parts.filter( Boolean ).join( ' – ' );
}

/**
 * Adds, updates or removes the caption paragraph of every image slide.
 *
 * @param {Object[]} slides   Slide blocks.
 * @param {string}   style    Caption style.
 * @param {Object}   dispatch Block editor actions.
 */
export async function applyCaptions( slides, style, dispatch ) {
	for ( const slide of slides ) {
		const bg = slide.attributes.background || {};
		const existing = slide.innerBlocks.find(
			( b ) =>
				b.name === 'core/paragraph' &&
				( b.attributes.className || '' ).includes( CLASS )
		);
		const content =
			bg.backgroundType === 'image'
				? await captionOf( bg.backgroundImage?.id, style )
				: '';
		dispatch.updateBlockAttributes( slide.clientId, {
			autoCaption: style,
		} );
		if ( existing && content ) {
			dispatch.updateBlockAttributes( existing.clientId, { content } );
		} else if ( existing ) {
			dispatch.removeBlock( existing.clientId, false );
		} else if ( content ) {
			dispatch.insertBlocks(
				createBlock( 'core/paragraph', { content, className: CLASS } ),
				slide.innerBlocks.length,
				slide.clientId,
				false
			);
		}
	}
}
