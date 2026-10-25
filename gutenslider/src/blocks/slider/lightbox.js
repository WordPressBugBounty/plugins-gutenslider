/**
 * Lightbox on a native <dialog>, loaded on the first click (replaces
 * lightGallery from 6.x and keeps its settings: title and caption source,
 * counter, thumbnails, background and text color).
 *
 * The browser provides the modal behavior: top layer, focus trap, Escape to
 * close, inert page. This adds paging, arrow keys, swipe, a counter, captions,
 * thumbnails and focus return, and moves the slider to the photo that was
 * open when the lightbox closes.
 *
 * A view module the slider names (its `modules` setting, see mount.js) can
 * add to the lightbox with a `lightbox( api )` export; see extend().
 *
 * With the "zoom" opening (the default), the photo grows out of its slide and
 * shrinks back into it on close (Web Animations, transform and clip-path
 * only): it starts cropped exactly like the slide shows it and opens up to its
 * own shape, while the background and controls fade in around it. "fade" and
 * reduced motion fade the whole viewer instead.
 */

import { getConfig } from '@wordpress/interactivity';
import { lightboxMedia } from './lightbox-media';
import { loadModule } from './mount';

const EASE = 'cubic-bezier(0.25, 1, 0.5, 1)';
const SWIPE = 50;

const CSS = `
.gs-lightbox{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:var(--gs-lb-fg,#000);font-family:inherit;overscroll-behavior:contain;isolation:isolate;opacity:0;transition:opacity .25s ${ EASE },display .25s allow-discrete,overlay .25s allow-discrete}
.gs-lightbox[open]{opacity:1;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto}
@starting-style{.gs-lightbox[open]{opacity:0}}
.gs-lightbox.is-flying{transition:none;opacity:1}
.gs-lightbox.is-flying .gs-lb-stage{overflow:visible;z-index:1}
.gs-lightbox::backdrop{background:transparent}
.gs-lightbox:focus{outline:none}
.gs-lb-backdrop{position:absolute;inset:0;z-index:-1;background:var(--gs-lb-bg,#fff)}
.gs-lb-bar{display:flex;align-items:center;gap:1rem;padding:.5rem .75rem .5rem 1rem;font-size:14px;line-height:1.4;font-variant-numeric:tabular-nums}
.gs-lightbox button{appearance:none;border:0;background:transparent;color:inherit;cursor:pointer;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;padding:0;box-shadow:none}
.gs-lightbox button:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
.gs-lightbox button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.gs-lightbox button[aria-pressed="true"]{background:color-mix(in srgb,currentColor 18%,transparent)}
.gs-lb-tools{display:flex;gap:.25rem;margin-inline-start:auto}
.gs-lb-stage{position:relative;display:grid;place-items:center;min-height:0;overflow:hidden;touch-action:pan-y pinch-zoom;padding:0 64px}
.gs-lb-image{display:block;max-width:none;max-height:none;height:auto;margin:0;background:center/cover no-repeat;user-select:none;-webkit-user-drag:none;transition:scale .3s ${ EASE };cursor:default}
.gs-lb-video{display:block;max-width:100%;max-height:100%;width:auto;height:auto}
.gs-lightbox .gs-lb-nav{position:absolute;top:50%;translate:0 -50%}
.gs-lb-prev{left:10px}.gs-lb-next{right:10px}
.gs-lb-caption{padding:.75rem 1rem 1rem;text-align:center;font-size:15px;line-height:1.5}
.gs-lb-caption:empty{padding:.5rem}
.gs-lb-caption h2{margin:0 0 .25rem;font:inherit;font-weight:600;color:inherit}
.gs-lb-caption p{margin:0;opacity:.8}
.gs-lb-thumbs{display:flex;gap:6px;overflow-x:auto;padding:0 1rem 1rem;justify-content:safe center;scrollbar-width:thin}
.gs-lightbox .gs-lb-thumbs button{flex:0 0 auto;width:64px;height:48px;border-radius:4px;overflow:hidden;opacity:.55;border:2px solid transparent;transition:opacity .2s}
.gs-lightbox .gs-lb-thumbs button:hover{opacity:.85;background:none}
.gs-lightbox .gs-lb-thumbs button[aria-current="true"]{opacity:1;border-color:currentColor}
.gs-lb-thumbs :is(img,video){width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:600px){.gs-lb-stage{padding:0}.gs-lightbox .gs-lb-nav{display:none}}
@media (prefers-reduced-motion:reduce){.gs-lightbox,.gs-lb-image{transition:none}}
`;

const ICONS = {
	prev: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
	next: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
	close: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
};

let dialog;
let ui = {};
let items = [];
let index = 0;
let slider = null;
let opener = null;
let settings = {};
let labels = {};
let running = [];
let hidden = null;
let closing = false;
// What view modules added (extend()): hooks by module name, and the ones
// the open slider uses.
const extensions = new Map();
let hooks = [];
let openings = 0;

/**
 * Runs a hook of the open slider's extensions.
 *
 * @param {string} name Hook name.
 * @param {...*}   args Arguments.
 * @return {boolean} Whether a hook returned true.
 */
const hook = ( name, ...args ) =>
	hooks.reduce(
		( done, h ) => ( h[ name ]?.( ...args ) === true ? true : done ),
		false
	);

const reducedMotion = () =>
	window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

/**
 * Text for the title or caption line, from the image's data attributes;
 * an Image block's caption comes from its figcaption first.
 *
 * @param {HTMLElement} media  Image or video.
 * @param {string}      source 'title', 'caption', 'description', 'alt' or 'none'.
 * @return {string} Text.
 */
function textOf( media, source ) {
	if ( ! media || ! source || source === 'none' ) {
		return '';
	}
	if ( source === 'alt' ) {
		return media.getAttribute( 'alt' ) || '';
	}
	const figcaption =
		source === 'caption'
			? media.closest( 'figure' )?.querySelector( ':scope > figcaption' )
			: null;
	return figcaption?.textContent.trim() || media.dataset[ source ] || '';
}

/**
 * Lightbox items for a slider: the media of every slide (lightbox-media.js),
 * in slide order, without loop duplicates. `pos` is the media's place in its
 * slide, to find it in a loop copy of the slide.
 *
 * @param {HTMLElement} el Slider element.
 * @return {Object[]} Items.
 */
function collect( el ) {
	return (
		[ ...el.querySelectorAll( '.swiper-wrapper > .swiper-slide' ) ]
			.filter(
				( s ) => ! s.classList.contains( 'swiper-slide-duplicate' )
			)
			.flatMap( ( slide, i ) =>
				lightboxMedia( slide ).map( ( media, pos ) => ( {
					slide,
					media,
					pos,
					video: media.tagName === 'VIDEO',
					// Loop mode moves slides around; the real order is Swiper's index.
					order: Number( slide.dataset.swiperSlideIndex ?? i ),
				} ) )
			)
			// Stable: the media of a slide keep their order.
			.sort( ( a, b ) => a.order - b.order )
	);
}

/**
 * Where a slide's photo is on screen: its frame, how the photo fills it
 * (object-fit and -position) and the part the page shows (the slider and
 * other overflowing ancestors clip it).
 *
 * @param {HTMLElement} media Slide image.
 * @return {Object|null} Geometry, or null when it is off screen.
 */
function measure( media ) {
	const frame = media?.closest( '.eedee-background-div' ) || media;
	const rect = frame?.getBoundingClientRect();
	if ( ! rect?.width || ! rect.height ) {
		return null;
	}
	let visible = {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight,
	};
	for ( let el = frame; el && el !== document.body; el = el.parentElement ) {
		const style = window.getComputedStyle( el );
		if (
			el === frame ||
			style.overflowX !== 'visible' ||
			style.overflowY !== 'visible'
		) {
			const r = el.getBoundingClientRect();
			visible = {
				left: Math.max( visible.left, r.left ),
				top: Math.max( visible.top, r.top ),
				right: Math.min( visible.right, r.right ),
				bottom: Math.min( visible.bottom, r.bottom ),
			};
		}
	}
	// Mostly hidden (a slide at the carousel's edge): no flight.
	if (
		( visible.right - visible.left ) * ( visible.bottom - visible.top ) <
		rect.width * rect.height * 0.25
	) {
		return null;
	}
	const style = window.getComputedStyle( media );
	const [ px = 50, py = 50 ] = style.objectPosition
		.split( ' ' )
		.map( ( v ) => ( v.endsWith( '%' ) ? parseFloat( v ) : 50 ) );
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2,
		width: rect.width,
		height: rect.height,
		contain:
			style.objectFit === 'contain' || style.objectFit === 'scale-down',
		px: px / 100,
		py: py / 100,
		visible,
	};
}

/**
 * The lightbox image's transform and clip at the slide: scaled like the
 * slide shows it (cover or contain, at its focal point), clipped to the
 * visible part.
 *
 * @param {DOMRect} to    The lightbox image's own box.
 * @param {Object}  thumb Slide geometry from measure().
 * @return {Object} Keyframe.
 */
function thumbFrame( to, thumb ) {
	const s = ( thumb.contain ? Math.min : Math.max )(
		thumb.width / to.width,
		thumb.height / to.height
	);
	// The photo's center on the slide, shifted by its focal point.
	const x = thumb.x + ( thumb.width - to.width * s ) * ( thumb.px - 0.5 );
	const y = thumb.y + ( thumb.height - to.height * s ) * ( thumb.py - 0.5 );
	const local = ( v, c, size ) => ( v - c ) / s + size / 2;
	const px = ( n ) => `${ Math.max( 0, n ).toFixed( 2 ) }px`;
	const clip = [
		local( thumb.visible.top, y, to.height ),
		to.width - local( thumb.visible.right, x, to.width ),
		to.height - local( thumb.visible.bottom, y, to.height ),
		local( thumb.visible.left, x, to.width ),
	];
	return {
		transform: `translate(${ x - ( to.left + to.width / 2 ) }px, ${ y - ( to.top + to.height / 2 ) }px) scale(${ s })`,
		clipPath: `inset(${ clip.map( px ).join( ' ' ) })`,
	};
}

const IMAGE_OPEN = { transform: 'none', clipPath: 'inset(0px 0px 0px 0px)' };

/**
 * Hides the slide's photo while it is in the lightbox (it flew out of there
 * and flies back). Without an argument, shows it again.
 *
 * @param {HTMLElement|null} media Slide image.
 */
function conceal( media = null ) {
	if ( hidden === media ) {
		return;
	}
	if ( hidden ) {
		hidden.style.visibility = '';
	}
	hidden = media;
	if ( media ) {
		media.style.visibility = 'hidden';
	}
}

function land() {
	running.forEach( ( a ) => a.cancel() );
	running = [];
	dialog.classList.remove( 'is-flying' );
}

/**
 * Animates between the slide and the open lightbox.
 *
 * @param {boolean}          opening Open (true) or close (false).
 * @param {HTMLElement|null} media   The slide image to fly from or to.
 * @return {Promise<boolean>} Whether it animated.
 */
function fly( opening, media ) {
	land();
	const thumb =
		settings.lgOpen !== 'fade' &&
		! reducedMotion() &&
		! items[ index ]?.video
			? measure( media )
			: null;
	if ( ! thumb ) {
		return Promise.resolve( false );
	}
	const at = thumbFrame( ui.image.getBoundingClientRect(), thumb );
	const timing = {
		duration: opening ? 420 : 320,
		easing: EASE,
		fill: 'both',
	};
	const fade = opening
		? [ { opacity: 0 }, { opacity: 1 } ]
		: [ { opacity: 1 }, { opacity: 0 } ];
	dialog.classList.add( 'is-flying' );
	if ( opening ) {
		// Hide the slide's photo once the flying one can paint, not before:
		// its place would flash empty for a frame.
		Promise.race( [
			ui.image.decode(),
			new Promise( ( r ) => setTimeout( r, 250 ) ),
		] )
			.catch( () => {} )
			.then( () => dialog.open && ! closing && conceal( media ) );
	} else {
		conceal( media );
	}
	running = [
		ui.image.animate(
			opening ? [ at, IMAGE_OPEN ] : [ IMAGE_OPEN, at ],
			timing
		),
		...[ ui.backdrop, ui.bar, ui.caption, ui.thumbs, ui.prev, ui.next ].map(
			( el ) =>
				el.animate( fade, {
					...timing,
					duration: timing.duration * 0.8,
				} )
		),
	];
	return running[ 0 ].finished.then(
		() => true,
		() => false
	);
}

function build() {
	const style = document.createElement( 'style' );
	style.textContent = CSS;
	document.head.append( style );

	dialog = document.createElement( 'dialog' );
	dialog.className = 'gs-lightbox';
	dialog.setAttribute( 'aria-label', labels.viewer || 'Image viewer' );
	// Focus the dialog itself on open: no focus ring on a button until the
	// visitor tabs to it.
	dialog.autofocus = true;
	dialog.tabIndex = -1;
	dialog.innerHTML = `
		<div class="gs-lb-backdrop"></div>
		<div class="gs-lb-bar"><span class="gs-lb-counter" aria-live="polite"></span>
			<div class="gs-lb-tools"><button type="button" class="gs-lb-close">${ ICONS.close }</button></div></div>
		<div class="gs-lb-stage"><img class="gs-lb-image" alt="" decoding="async"></div>
		<div class="gs-lb-caption"></div>
		<div class="gs-lb-thumbs"></div>`;
	document.body.append( dialog );
	const $ = ( s ) => dialog.querySelector( s );
	ui = {
		backdrop: $( '.gs-lb-backdrop' ),
		bar: $( '.gs-lb-bar' ),
		counter: $( '.gs-lb-counter' ),
		stage: $( '.gs-lb-stage' ),
		image: $( '.gs-lb-image' ),
		caption: $( '.gs-lb-caption' ),
		thumbs: $( '.gs-lb-thumbs' ),
		tools: $( '.gs-lb-tools' ),
		close: $( '.gs-lb-close' ),
	};
	ui.close.setAttribute( 'aria-label', labels.close || 'Close' );
	for ( const dir of [ 'prev', 'next' ] ) {
		const b = document.createElement( 'button' );
		b.type = 'button';
		b.className = `gs-lb-nav gs-lb-${ dir }`;
		b.setAttribute( 'aria-label', labels[ dir ] || dir );
		b.innerHTML = ICONS[ dir ];
		b.addEventListener( 'click', () =>
			go( index + ( dir === 'prev' ? -1 : 1 ) )
		);
		ui[ dir ] = b;
		ui.stage.append( b );
	}

	ui.close.addEventListener( 'click', close );
	// Escape closes with the same animation as the close button (unless an
	// extension takes it).
	dialog.addEventListener( 'cancel', ( e ) => {
		e.preventDefault();
		if ( ! hook( 'cancel' ) ) {
			close();
		}
	} );
	dialog.addEventListener( 'keydown', ( e ) => {
		// Not on to the page: sliders with keyboard control listen there.
		e.stopPropagation();
		if ( e.key === 'ArrowLeft' || e.key === 'ArrowRight' ) {
			e.preventDefault();
			go( index + ( e.key === 'ArrowLeft' ? -1 : 1 ) );
		}
	} );
	dialog.addEventListener( 'close', onClose );

	// A click on the empty stage or the photo closes, flying back into the
	// slide (unless an extension takes the click). Not the click after a
	// swipe.
	let swiped = false;
	ui.stage.addEventListener( 'click', ( e ) => {
		if ( swiped ) {
			swiped = false;
			return;
		}
		if ( hook( 'click', e ) ) {
			return;
		}
		if ( e.target === ui.stage || e.target === ui.image ) {
			close();
		}
	} );
	let startX = null;
	ui.stage.addEventListener( 'pointerdown', ( e ) => {
		swiped = false;
		startX = e.pointerType === 'mouse' ? null : e.clientX;
	} );
	ui.stage.addEventListener( 'pointerup', ( e ) => {
		if ( startX === null || hook( 'holdSwipe' ) ) {
			return;
		}
		const dx = e.clientX - startX;
		startX = null;
		if ( Math.abs( dx ) > SWIPE ) {
			swiped = true;
			go( index + ( dx < 0 ? 1 : -1 ) );
		}
	} );

	// Rotating a phone, resizing the window, a longer caption: the photo refits.
	new window.ResizeObserver(
		() =>
			dialog.open &&
			! items[ index ]?.video &&
			fit( items[ index ].media )
	).observe( ui.stage );
}

/**
 * Sizes the lightbox image before it loads: as large as the stage allows,
 * not beyond its own pixels. No shift, and the flight knows its target.
 *
 * @param {HTMLImageElement} media Slide image.
 */
function fit( media ) {
	const w = Number( media.getAttribute( 'width' ) ) || media.naturalWidth;
	const h = Number( media.getAttribute( 'height' ) ) || media.naturalHeight;
	const style = window.getComputedStyle( ui.stage );
	const roomW =
		ui.stage.clientWidth -
		parseFloat( style.paddingLeft ) -
		parseFloat( style.paddingRight );
	const roomH = ui.stage.clientHeight;
	if ( ! w || ! h || ! roomW || ! roomH ) {
		ui.image.style.width = '';
		ui.image.style.aspectRatio = '';
		return;
	}
	// Not beyond the photo's pixels (unless an extension fills the stage).
	const cap = hook( 'fill' ) ? Infinity : w;
	const width = Math.round( Math.min( roomW, roomH * ( w / h ), cap ) );
	ui.image.style.aspectRatio = `${ w } / ${ h }`;
	ui.image.style.width = `${ width }px`;
	ui.image.sizes = `${ width }px`;
}

function go( to ) {
	const count = items.length;
	if ( ! count ) {
		return;
	}
	index = settings.loop
		? ( to + count ) % count
		: Math.max( 0, Math.min( count - 1, to ) );
	const { media, video } = items[ index ];

	ui.stage.querySelector( '.gs-lb-video' )?.remove();
	ui.image.hidden = video;
	if ( video ) {
		const player = document.createElement( 'video' );
		player.className = 'gs-lb-video';
		player.src = media.currentSrc || media.src;
		player.controls = true;
		player.playsInline = true;
		player.loop = media.loop;
		if ( media.poster ) {
			player.poster = media.poster;
		}
		ui.stage.prepend( player );
	} else {
		// sizes before srcset before src: the browser fetches one file. The
		// slide's file (already decoded) shows until the right one arrives.
		ui.image.style.backgroundImage = media.currentSrc
			? `url("${ media.currentSrc }")`
			: '';
		if ( media.srcset ) {
			ui.image.srcset = media.srcset;
		} else {
			ui.image.removeAttribute( 'srcset' );
		}
		ui.image.src = media.currentSrc || media.src;
		ui.image.alt = media.alt || '';
	}
	// Paging after a flight: the empty place follows the photo.
	if ( hidden ) {
		conceal( video ? null : media );
	}
	hook( 'go', items[ index ] );

	ui.counter.textContent =
		settings.hasLgCounter && count > 1 ? `${ index + 1 } / ${ count }` : '';
	const title = textOf( media, settings.lgTitle );
	const caption = textOf( media, settings.lgCaption );
	ui.caption.replaceChildren();
	if ( title ) {
		const h = document.createElement( 'h2' );
		h.textContent = title;
		ui.caption.append( h );
	}
	if ( caption ) {
		const p = document.createElement( 'p' );
		p.textContent = caption;
		ui.caption.append( p );
	}
	ui.prev.hidden = count < 2 || ( ! settings.loop && index === 0 );
	ui.next.hidden = count < 2 || ( ! settings.loop && index === count - 1 );
	ui.thumbs.querySelectorAll( 'button' ).forEach( ( b, i ) => {
		b.setAttribute( 'aria-current', String( i === index ) );
		if ( i === index && dialog.open ) {
			b.scrollIntoView( { block: 'nearest', inline: 'nearest' } );
		}
	} );
	// Last: the caption and thumbnails decide how much room the photo has.
	if ( ! video ) {
		fit( media );
	}
	// A focused button that just hid would drop focus (and the arrow keys).
	if (
		dialog.open &&
		dialog.ownerDocument.activeElement?.closest( '[hidden]' )
	) {
		dialog.focus( { preventScroll: true } );
	}
}

function thumbnails() {
	ui.thumbs.replaceChildren();
	ui.thumbs.hidden = ! settings.lgThumbnails || items.length < 2;
	if ( ui.thumbs.hidden ) {
		return;
	}
	items.forEach( ( { media, video }, i ) => {
		const b = document.createElement( 'button' );
		b.type = 'button';
		b.setAttribute(
			'aria-label',
			( labels.show || 'Show image %d' ).replace( '%d', i + 1 )
		);
		// A video without a poster (a Video block, often) shows its first frame.
		const still = video && ! media.poster;
		const img = document.createElement( still ? 'video' : 'img' );
		if ( still ) {
			img.src = `${ media.currentSrc || media.src }#t=0.1`;
			img.muted = true;
			img.preload = 'metadata';
		} else {
			img.src = video ? media.poster : media.currentSrc || media.src;
			img.alt = '';
			img.loading = 'lazy';
		}
		b.append( img );
		b.addEventListener( 'click', () => go( i ) );
		ui.thumbs.append( b );
	} );
}

/**
 * The slide showing the lightbox's photo, visible on the page: the slider
 * stays where it is when the photo is in view (the clicked slide, or a loop
 * copy of it), else it jumps there without animation.
 *
 * @return {HTMLElement|null} Slide image to fly back to.
 */
function homeMedia() {
	const item = items[ index ];
	const swiper = slider?.gutenslider?.swiperInstance;
	if ( ! item ) {
		return null;
	}
	const copies = swiper
		? [ ...swiper.slides ].filter(
				( s ) =>
					s === item.slide ||
					( item.slide.dataset.swiperSlideIndex !== undefined &&
						s.dataset.swiperSlideIndex ===
							item.slide.dataset.swiperSlideIndex )
			)
		: [ item.slide ];
	// Effects that show one slide at a time: every slide "measures" as
	// visible there, but only the active one shows.
	const stacked = slider.matches( '.gs-stacked, .gs-single' );
	let slide = copies.find(
		( s ) =>
			( ! stacked || s.classList.contains( 'swiper-slide-active' ) ) &&
			measure( lightboxMedia( s )[ item.pos ] )
	);
	if ( ! slide && swiper ) {
		const i = swiper.slides.indexOf( item.slide );
		if ( swiper.params.loop ) {
			swiper.slideToLoop( item.order, 0 );
		} else if ( i >= 0 ) {
			swiper.slideTo( i, 0 );
		}
		slide = swiper.slides[ swiper.activeIndex ];
	}
	return ( slide && lightboxMedia( slide )[ item.pos ] ) || null;
}

function close() {
	if ( ! dialog.open || closing ) {
		return;
	}
	closing = true;
	hook( 'closing' );
	ui.stage.querySelector( '.gs-lb-video' )?.pause();
	fly( false, homeMedia() ).then( () => {
		closing = false;
		// Still in flight styles, so the dialog closes at once with the photo
		// resting on the slide; then the slide takes over.
		dialog.close();
		window.getComputedStyle( dialog ).display; // eslint-disable-line no-unused-expressions
		hook( 'reset' );
		land();
		conceal();
	} );
}

function onClose() {
	// Also for a close the browser does without our animation.
	closing = false;
	land();
	conceal();
	ui.stage.querySelector( '.gs-lb-video' )?.remove();
	ui.image.removeAttribute( 'srcset' );
	ui.image.removeAttribute( 'src' );
	const swiper = slider?.gutenslider?.swiperInstance;
	if ( swiper ) {
		homeMedia();
		if ( swiper.params.autoplay?.enabled ) {
			setTimeout( () => swiper.autoplay?.start(), 1000 );
		}
	}
	opener?.focus?.( { preventScroll: true, focusVisible: false } );
	opener = null;
}

/**
 * The lightbox extensions of the slider's view modules: a module's
 * `lightbox( api )` runs once, the first time the lightbox opens with it,
 * and returns hooks, all optional:
 * - `open( settings )`: the lightbox opens for a slider with these settings.
 * - `go( item )`: a photo or video ({ media, video, slide }) is shown.
 * - `click( event )`, `cancel()`: a click on the stage, Escape; return
 *   true to take it.
 * - `fill()`: return true to size the photo to the stage, past its pixels.
 * - `holdSwipe()`: return true to ignore swipes.
 * - `closing()`, `reset()`: the lightbox starts to close, has closed.
 *
 * @param {string[]} names View module names.
 * @return {Promise<Object[]>} Hooks.
 */
async function extend( names = [] ) {
	const api = {
		dialog,
		ui,
		labels,
		fit: () => ! items[ index ]?.video && fit( items[ index ].media ),
		item: () => items[ index ],
		settings: () => settings,
	};
	// The promise is kept, so a module's lightbox() runs once even when
	// two openings ask for it at the same time.
	names.forEach( ( name ) => {
		if ( ! extensions.has( name ) ) {
			extensions.set(
				name,
				loadModule( name ).then( ( m ) =>
					m?.lightbox ? m.lightbox( api ) : null
				)
			);
		}
	} );
	const list = await Promise.all(
		names.map( ( name ) => extensions.get( name ) )
	);
	return list.filter( Boolean );
}

/**
 * Opens the lightbox at a slide.
 *
 * @param {HTMLElement} el    Slider element.
 * @param {HTMLElement} slide Slide to show.
 * @param {HTMLElement} media The slide's image or video to show (default:
 *                            its first).
 */
export async function open( el, slide, media ) {
	labels = getConfig( 'gutenslider' )?.labels || {};
	if ( ! dialog ) {
		build();
	}
	if ( dialog.open ) {
		return;
	}
	const next = JSON.parse( el.dataset.settings || '{}' );
	// Only the latest opening goes on once its modules are there.
	const ticket = ++openings;
	const nextHooks = await extend( next.modules );
	if ( dialog.open || ticket !== openings ) {
		return;
	}
	hooks = nextHooks;
	slider = el;
	opener = slide;
	settings = next;
	hook( 'open', settings );
	settings.loop = !! el.gutenslider?.swiperInstance?.params.loop;
	items = collect( el );
	const styles = el.ownerDocument.defaultView.getComputedStyle(
		el.querySelector( '.eedee-swiper-outer' ) || el
	);
	dialog.style.setProperty(
		'--gs-lb-bg',
		styles.getPropertyValue( '--gutenslider-lightgallery-bg' ).trim() ||
			'#fff'
	);
	dialog.style.setProperty(
		'--gs-lb-fg',
		styles.getPropertyValue( '--gutenslider-lightgallery-font' ).trim() ||
			'#000'
	);
	thumbnails();
	el.gutenslider?.swiperInstance?.autoplay?.stop();

	// The clicked slide may be a loop copy: its photo is the one to fly from.
	const inSlide = lightboxMedia( slide );
	const clicked = media || inSlide[ 0 ];
	const pos = Math.max( 0, inSlide.indexOf( clicked ) );
	// A loop copy (gs-clone) has a Swiper index of its own past the real
	// slides: its original is that index modulo their number.
	const originals = el.querySelectorAll(
		'.swiper-wrapper > .swiper-slide:not(.gs-clone)'
	).length;
	const real =
		slide.classList.contains( 'gs-clone' ) &&
		slide.dataset.swiperSlideIndex !== undefined &&
		originals
			? String( Number( slide.dataset.swiperSlideIndex ) % originals )
			: slide.dataset.swiperSlideIndex;
	const at = items.findIndex(
		( item ) =>
			item.pos === pos &&
			( item.slide === slide ||
				( real !== undefined &&
					item.slide.dataset.swiperSlideIndex === real ) )
	);
	// Flying replaces the CSS fade; decide before the dialog opens.
	dialog.classList.toggle(
		'is-flying',
		settings.lgOpen !== 'fade' && ! reducedMotion() && !! measure( clicked )
	);
	// Open first, so the photo can be measured; the animation's first frame
	// puts it on the slide before anything paints.
	dialog.showModal();
	dialog.focus( { preventScroll: true } );
	go( Math.max( 0, at ) );
	fly( true, clicked ).then( ( landed ) => landed && land() );
}
