/**
 * Front end of the slider, as an Interactivity API store.
 *
 * The server already printed the final layout (see style/layout.scss), so
 * nothing here is needed for the first paint. `callbacks.init` runs per
 * slider and creates its Swiper (mount.js) once it comes near the viewport.
 */
import { store, getElement, getConfig } from '@wordpress/interactivity';
import { BREAKPOINTS, mount, setViewModules, whenNear } from './mount';
import { isBackground, lightboxMedia } from './lightbox-media';

setViewModules( getConfig( 'gutenslider' ).modules );

/**
 * Opens the lightbox for a clicked slide.
 *
 * @param {HTMLElement} el    Slider element.
 * @param {HTMLElement} slide Clicked slide.
 * @param {HTMLElement} media The image or video to show.
 */
async function openLightbox( el, slide, media ) {
	const { open } = await import(
		/* webpackChunkName: "lightbox" */ './lightbox'
	);
	open( el, slide, media );
}

store( 'gutenslider', {
	callbacks: {
		init() {
			const { ref: el } = getElement();
			whenNear( el, () => mount( el ) );

			// Re-create on breakpoint changes, as 6.x did.
			let band =
				window.innerWidth > BREAKPOINTS[ 1 ]
					? 2
					: +( window.innerWidth > BREAKPOINTS[ 0 ] );
			window.addEventListener( 'resize', () => {
				const now =
					window.innerWidth > BREAKPOINTS[ 1 ]
						? 2
						: +( window.innerWidth > BREAKPOINTS[ 0 ] );
				if ( now !== band && el.gutenslider?.swiperInstance ) {
					band = now;
					mount( el );
				}
			} );

			if ( el.classList.contains( 'gs-has-lightbox' ) ) {
				el.addEventListener( 'click', ( event ) => {
					const slide = event.target.closest( '.swiper-slide' );
					// defaultPrevented: another script already used the click.
					if (
						event.defaultPrevented ||
						! slide ||
						event.target.closest(
							'a, button, input, select, textarea, .wp-lightbox-container'
						)
					) {
						return;
					}
					// An Image or Video block opens at itself; anywhere else,
					// the slide's background does.
					const media = lightboxMedia( slide );
					const clicked =
						media.find( ( m ) => m === event.target ) ||
						( media[ 0 ] && isBackground( media[ 0 ] )
							? media[ 0 ]
							: null );
					if ( clicked ) {
						// A video block would start playing in place, too.
						event.preventDefault();
						openLightbox( el, slide, clicked );
					}
				} );
			}
		},
	},
} );
