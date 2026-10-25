/**
 * What the lightbox shows of a slide: its background image or video, then
 * the Image and Video blocks on it, in order. Shared by the click handler
 * (view.js) and the lightbox, so both agree on what opens.
 *
 * Left out: video slides from links (they play in place), slides with a
 * link (the link covers the slide), linked images (they sit in an <a>) and
 * images with the Image block's own "Expand on click".
 */
const BACKGROUND = '.eedee-background-div img, .eedee-background-div video';
const BLOCKS = [
	'.slide-content figure.wp-block-image:not(.wp-lightbox-container) > img',
	'.slide-content figure.wp-block-video > video',
].join( ',' );

/**
 * The slide's media for the lightbox.
 *
 * @param {HTMLElement} slide Slide.
 * @return {HTMLElement[]} Images and videos, background first.
 */
export function lightboxMedia( slide ) {
	if ( slide.querySelector( ':scope > .slide-link' ) ) {
		return [];
	}
	const media = [];
	if (
		slide.matches( '.ed-bg-image, .ed-bg-video' ) &&
		! slide.matches( '.ed-bg-embed, .ed-bg-youtube' )
	) {
		const background = slide.querySelector( BACKGROUND );
		if ( background ) {
			media.push( background );
		}
	}
	return [ ...media, ...slide.querySelectorAll( BLOCKS ) ];
}

/**
 * Whether the media is the slide's background (not a block on it).
 *
 * @param {HTMLElement} media Image or video.
 * @return {boolean} Background.
 */
export const isBackground = ( media ) =>
	!! media.closest( '.eedee-background-div' );
