/**
 * Creates the Swiper instance of a slider from its server-rendered markup:
 * loads Swiper plus only the modules that slider uses, as separate chunks.
 *
 * Shared by the front end (view.js) and the editor's Preview. Everything
 * reads the slider's own window, so it also works in the editor's iframe.
 *
 * For code that hooked into 6.x: the element gets `el.gutenslider` with
 * `swiperInstance` and `destroy()`, and a `gutenslider:init` event.
 */
export const BREAKPOINTS = [ 600, 960 ];
const reducedMotion = ( win = window ) =>
	win.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

// Reduced motion: the least time a change of slides takes, so a fade is
// gentle (Advanced: "Autoplay for visitors who prefer reduced motion").
const CALM_SPEED = 1200;

const controls = () =>
	import( /* webpackChunkName: "swiper-controls" */ './swiper-controls' );
const MODULES = {
	a11y: () => controls().then( ( m ) => m.a11y ),
	navigation: () => controls().then( ( m ) => m.navigation ),
	pagination: () => controls().then( ( m ) => m.pagination ),
	autoplay: () => controls().then( ( m ) => m.autoplay ),
	keyboard: () => controls().then( ( m ) => m.keyboard ),
	hashNavigation: () =>
		import(
			/* webpackChunkName: "swiper-hash" */ 'swiper-modules/hash-navigation.mjs'
		),
	fade: () =>
		import(
			/* webpackChunkName: "swiper-fade" */ 'swiper-modules/effect-fade.mjs'
		),
	flip: () =>
		import(
			/* webpackChunkName: "swiper-flip" */ 'swiper-modules/effect-flip.mjs'
		),
};

// Script modules another plugin adds (Render::view_module_urls(), the
// `gutenslider_view_modules` filter); a slider names the ones it needs in
// its `modules` setting.
let viewModules = {};

/**
 * Where the view modules are, by name.
 *
 * @param {Object} modules Module URLs by name.
 */
export function setViewModules( modules ) {
	viewModules = modules && typeof modules === 'object' ? modules : {};
}

/**
 * A view module, or null when there is none of that name.
 *
 * @param {string} name Module name.
 * @return {Promise<Object|null>} Module namespace.
 */
export const loadModule = ( name ) =>
	viewModules[ name ]
		? import( /* webpackIgnore: true */ viewModules[ name ] ).catch(
				() => null
			)
		: Promise.resolve( null );

const loadSwiper = () =>
	import( /* webpackChunkName: "swiper" */ 'swiper/core' ).then(
		( m ) => m.default
	);

/**
 * A Swiper module from a module file (default export) or already unwrapped.
 *
 * @param {Object|Function} mod Module namespace or module.
 * @return {Function} Swiper module.
 */
const firstExport = ( mod ) =>
	typeof mod === 'function' ? mod : mod.default || Object.values( mod )[ 0 ];

/**
 * Settings for the current breakpoint, like 6.x: the base settings are
 * mobile, `settingsMd` and `settingsLg` override them.
 *
 * @param {Object} settings data-settings of the slider.
 * @param {Window} win      Window of the slider (the editor's iframe, say).
 * @return {Object} Swiper parameters.
 */
export function settingsForViewport( settings, win = window ) {
	const width = win.innerWidth;
	const { settingsMd, settingsLg, ...base } = settings;
	if ( width > BREAKPOINTS[ 1 ] ) {
		return { ...base, ...settingsLg };
	}
	if ( width > BREAKPOINTS[ 0 ] ) {
		return { ...base, ...settingsMd };
	}
	return base;
}

/**
 * Runs `callback` once the element is within one viewport of being visible.
 *
 * @param {HTMLElement} el       Element.
 * @param {Function}    callback Callback.
 */
export function whenNear( el, callback ) {
	const win = el.ownerDocument.defaultView;
	if ( ! ( 'IntersectionObserver' in win ) ) {
		callback();
		return;
	}
	const observer = new win.IntersectionObserver(
		( entries ) => {
			if ( entries.some( ( e ) => e.isIntersecting ) ) {
				observer.disconnect();
				callback();
			}
		},
		{ rootMargin: '100% 0px' }
	);
	observer.observe( el );
}

/**
 * The width a "cover" slide image is drawn at: wider than its box when the
 * box is relatively taller than the image (a landscape photo on a phone).
 * Layout sizes, so the 3D effects' transforms don't count. 0 for other
 * images, or when the size is not known.
 *
 * @param {HTMLImageElement} img Image.
 * @return {number} CSS pixels.
 */
function coverWidth( img ) {
	const ratio =
		Number( img.getAttribute( 'width' ) ) /
		Number( img.getAttribute( 'height' ) );
	if (
		! img.classList.contains( 'gs-slide-media' ) ||
		img.style.objectFit !== 'cover' ||
		! ratio ||
		! Number.isFinite( ratio ) ||
		! img.offsetWidth
	) {
		return 0;
	}
	return Math.ceil( Math.max( img.offsetWidth, img.offsetHeight * ratio ) );
}

/**
 * Makes the media of the slides next to the active one load now, so a slide
 * never comes in empty; plays and pauses background videos.
 *
 * @param {Object} swiper Swiper instance.
 */
function onSlide( swiper ) {
	const { slides, activeIndex } = swiper;
	[ -1, 1, 2 ].forEach( ( offset ) => {
		const slide =
			slides[ ( activeIndex + offset + slides.length ) % slides.length ];
		slide?.querySelectorAll( 'img[loading="lazy"]' ).forEach( ( img ) => {
			// Already loaded (several slides on screen): a new `sizes` would
			// pick another file from srcset and swap it in, which flickers.
			if ( img.complete && img.naturalWidth ) {
				return;
			}
			// `sizes="auto"` only works on lazy images; an eager one would
			// fall back to the largest file. A cover image gets the width it
			// is drawn at: `auto` would be its box's.
			const drawn = coverWidth( img );
			if ( drawn ) {
				img.sizes = `${ drawn }px`;
			} else if ( img.sizes.startsWith( 'auto,' ) ) {
				img.sizes = img.sizes.slice( 5 ).trim();
			}
			img.loading = 'eager';
		} );
	} );
	// Loop copies (fillLoop) are inert while off screen; one on screen is
	// the slide visitors see, so it takes clicks: links, the lightbox and
	// the video player's controls.
	slides.forEach( ( slide ) => {
		if ( ! slide.classList.contains( 'gs-clone' ) ) {
			return;
		}
		const shown =
			slide.classList.contains( 'swiper-slide-visible' ) ||
			slide.classList.contains( 'swiper-slide-active' );
		slide.inert = ! shown;
		if ( shown ) {
			slide.removeAttribute( 'aria-hidden' );
		} else {
			slide.setAttribute( 'aria-hidden', 'true' );
		}
	} );
	slides.forEach( ( slide ) => {
		const video = slide.querySelector( '.eedee-background-div video' );
		if ( ! video ) {
			return;
		}
		const visible =
			slide.classList.contains( 'swiper-slide-visible' ) ||
			slide.classList.contains( 'swiper-slide-active' );
		if ( visible || ! video.classList.contains( 'bg-video-autopause' ) ) {
			if ( video.paused && video.autoplay !== false ) {
				// Not allowed with sound (no click on the page yet): muted.
				video.play().catch( ( e ) => {
					if ( e?.name === 'NotAllowedError' && ! video.muted ) {
						// Not the visitor's choice: the shared sound keeps it.
						video.gsForcedMute = true;
						video.muted = true;
						video.play().catch( () => {} );
					}
				} );
			}
		} else if ( ! video.paused ) {
			video.pause();
		}
	} );
}

/**
 * Hash navigation needs a data-hash on every slide (6.x filled the gaps).
 * Numbered by the saved order (data-gs-pos after a shuffle), so a link
 * opens the same slide whatever the order.
 *
 * @param {HTMLElement} el Slider element.
 */
function fillHashes( el ) {
	const prefix = el.dataset.hash || el.id;
	el.querySelectorAll( '.swiper-wrapper > .swiper-slide' ).forEach(
		( slide, i ) => {
			if ( ! slide.dataset.hash ) {
				slide.dataset.hash = `${ prefix }-${
					Number( slide.dataset.gsPos ?? i ) + 1
				}`;
			}
		}
	);
}

/**
 * "Random order": the server prints a script that shuffles the slides
 * before the first paint (Render::shuffle_script()); this does the same
 * where it did not run, like the editor's Preview. Once per slider: a
 * re-mount keeps the order.
 *
 * @param {HTMLElement} el Slider element.
 */
function shuffle( el ) {
	if ( el.hasAttribute( 'data-gs-shuffled' ) ) {
		return;
	}
	const wrapper = el.querySelector( '.swiper-wrapper' );
	const slides = [ ...wrapper.children ];
	slides.forEach( ( slide, i ) => ( slide.dataset.gsPos = i ) );
	for ( let i = slides.length - 1; i > 0; i-- ) {
		const j = Math.floor( Math.random() * ( i + 1 ) );
		[ slides[ i ], slides[ j ] ] = [ slides[ j ], slides[ i ] ];
	}
	wrapper.append( ...slides );
	el.setAttribute( 'data-gs-shuffled', '' );
}

/**
 * Swiper's loop needs more slides than a short slider has (4 slides, 2 per
 * view, centered is already too few): clone the slides until there are
 * enough, as Swiper suggests. Clones are inert and hidden from assistive
 * technology while off screen (onSlide); the pagination and the lightbox
 * count only the real slides.
 *
 * @param {HTMLElement} el     Slider element.
 * @param {Object}      params Swiper parameters.
 * @return {number} Number of real slides when clones were added, else 0.
 */
function fillLoop( el, params ) {
	const wrapper = el.querySelector( '.swiper-wrapper' );
	wrapper
		.querySelectorAll( ':scope > .gs-clone' )
		.forEach( ( c ) => c.remove() );
	if ( ! params.loop ) {
		return 0;
	}
	const originals = [
		...wrapper.querySelectorAll( ':scope > .swiper-slide' ),
	];
	// Auto width: as many as the narrowest slide fits into the slider.
	const narrowest = Math.min(
		...originals.map( ( s ) => s.offsetWidth || Infinity )
	);
	const perView =
		params.slidesPerView === 'auto'
			? Math.ceil(
					el.clientWidth /
						( Number.isFinite( narrowest ) && narrowest > 0
							? narrowest
							: el.clientWidth / 3 )
				)
			: Number( params.slidesPerView );
	if ( ! perView ) {
		return 0;
	}
	const group = Math.max( 1, Number( params.slidesPerGroup ) || 1 );
	const looped = Math.max( group, Math.ceil( perView / 2 ) + 1 );
	const needed =
		Math.ceil( perView ) +
		// An effect that shows slides on both sides of the active one
		// (`loopFactor` 2) needs more of them.
		looped * ( Number( params.loopFactor ) || 1 ) +
		1;
	if ( originals.length < 2 || originals.length >= needed ) {
		return 0;
	}
	for ( let round = 1; wrapper.children.length < needed; round++ ) {
		originals.forEach( ( slide ) => {
			const clone = slide.cloneNode( true );
			clone.classList.add( 'gs-clone', 'swiper-slide-duplicate' );
			clone.setAttribute( 'aria-hidden', 'true' );
			clone.inert = true;
			clone
				.querySelectorAll( '[id]' )
				.forEach( ( n ) => n.removeAttribute( 'id' ) );
			if ( clone.dataset.hash ) {
				clone.dataset.hash += `-copy${ round }`;
			}
			wrapper.append( clone );
		} );
	}
	return originals.length;
}

/**
 * Reduced motion with several slides on screen, where a crossfade can't
 * work: the slides fade out, change without moving, and fade back in.
 * Wraps the methods the arrows, dots, keyboard, autoplay and hash links
 * call; Swiper's own repositioning (loop, resize, the end of a drag) and
 * explicit instant changes go straight through.
 *
 * @param {Object} swiper Swiper instance.
 * @param {number} ms     Length of the whole change.
 */
function fadeThrough( swiper, ms ) {
	const box = swiper.el;
	let passing = false;
	let fading = false;
	let touching = false;
	swiper.on( 'touchEnd', () => {
		touching = true;
		setTimeout( () => ( touching = false ) );
	} );
	const wrap = ( name, instant ) => {
		const original = swiper[ name ].bind( swiper );
		swiper[ name ] = ( ...args ) => {
			if (
				passing ||
				touching ||
				! swiper.initialized ||
				instant( args )
			) {
				return original( ...args );
			}
			if ( fading ) {
				return false;
			}
			fading = true;
			box.style.transition = `opacity ${ ms / 2 }ms ease`;
			box.style.opacity = '0';
			setTimeout( () => {
				if ( ! swiper.destroyed ) {
					passing = true;
					try {
						original( ...args );
					} finally {
						passing = false;
					}
				}
				box.style.opacity = '';
				setTimeout( () => {
					fading = false;
					box.style.transition = '';
				}, ms / 2 );
			}, ms / 2 );
			return true;
		};
	};
	wrap( 'slideNext', () => false );
	wrap( 'slidePrev', () => false );
	wrap( 'slideToLoop', ( [ , speed ] ) => speed === 0 );
	// ( index, speed, runCallbacks, internal, initial )
	wrap(
		'slideTo',
		( [ , speed, runCallbacks, , initial ] ) =>
			speed === 0 || runCallbacks === false || !! initial
	);
}

/**
 * Bullets for a slider with clones, over the real slides only. Built once
 * and updated in place (Swiper's custom pagination rewrites its HTML on
 * every change), so the bullets' transitions run.
 *
 * @param {HTMLElement} pagination Pagination element.
 * @param {Object}      options    Pagination settings.
 * @param {number}      count      Number of real slides.
 * @param {string}      direction  Swiper direction.
 * @param {string}      message    Bullet label, translated: "{{index}}" is the slide number.
 * @return {Function} Updates the pagination for a Swiper instance.
 */
export function realPagination(
	pagination,
	options,
	count,
	direction,
	message = 'Go to slide {{index}}'
) {
	pagination.className = pagination.className.replace(
		/\bswiper-pagination-\S+/g,
		''
	);
	pagination.classList.add(
		'swiper-pagination-custom',
		'swiper-pagination-bullets',
		`swiper-pagination-${ direction || 'horizontal' }`,
		'swiper-pagination-clickable'
	);
	pagination.innerHTML = Array.from(
		{ length: count },
		( _, i ) =>
			`<span class="swiper-pagination-bullet" data-gs-index="${ i }" role="button" tabindex="0"></span>`
	).join( '' );
	// Set as attributes: the label is text, not markup.
	[ ...pagination.children ].forEach( ( bullet, i ) =>
		bullet.setAttribute(
			'aria-label',
			message.replace( /\{\{index\}\}/g, i + 1 )
		)
	);
	if ( ! pagination.dataset.gsClick ) {
		pagination.dataset.gsClick = '1';
		const go = ( e ) => {
			const bullet = e.target.closest( '[data-gs-index]' );
			if ( bullet ) {
				pagination
					.closest( '.wp-block-eedee-block-gutenslider' )
					?.gutenslider?.swiperInstance?.slideToLoop(
						Number( bullet.dataset.gsIndex )
					);
			}
		};
		pagination.addEventListener( 'click', go );
		pagination.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Enter' || e.key === ' ' ) {
				e.preventDefault();
				go( e );
			}
		} );
	}
	return ( swiper ) => {
		const current = swiper.realIndex % count;
		[ ...pagination.children ].forEach( ( bullet, i ) => {
			bullet.classList.toggle(
				'swiper-pagination-bullet-active',
				i === current
			);
			bullet.toggleAttribute( 'aria-current', i === current );
		} );
	};
}

/**
 * Creates (or re-creates, after a breakpoint change) the Swiper instance.
 *
 * @param {HTMLElement} el Slider element.
 */
export async function mount( el ) {
	const win = el.ownerDocument.defaultView;
	const settings = JSON.parse( el.dataset.settings || '{}' );
	const state = el.gutenslider || { el, swiperInstance: null };
	el.gutenslider = state;

	const params = settingsForViewport( settings, win );
	const has = ( name ) => el.classList.contains( name );
	const wanted = [ 'a11y' ];
	if ( has( 'arrows-lg' ) || has( 'arrows-md' ) || has( 'arrows-sm' ) ) {
		wanted.push( 'navigation' );
	}
	if ( has( 'dots-lg' ) || has( 'dots-md' ) || has( 'dots-sm' ) ) {
		wanted.push( 'pagination' );
	}
	// Under reduced motion only if the slider asks for it (Advanced); the
	// slides then crossfade or change without a transition (below).
	if (
		params.autoplay &&
		( ! reducedMotion( win ) || params.autoplay.reducedMotion )
	) {
		wanted.push( 'autoplay' );
	} else {
		params.autoplay = false;
	}
	if ( params.keyboard ) {
		wanted.push( 'keyboard' );
		params.keyboard = params.keyboard.keyboard || params.keyboard;
	}
	if ( params.randomOrder ) {
		shuffle( el );
	}
	if ( params.hashNavigation ) {
		fillHashes( el );
		wanted.push( 'hashNavigation' );
	}
	// Reduced motion: a slider of one slide at a time crossfades instead of
	// moving; others fade out and in (speed 0, below, and fadeThrough()). At
	// least CALM_SPEED either way. Not for an effect a view module draws, except one only for
	// motion, which is not loaded then and leaves its base effect.
	const calm = reducedMotion( win );
	const crossfade =
		calm &&
		Number( params.slidesPerView ) === 1 &&
		[ 'slide', 'fade', 'flip' ].includes( params.effect || 'slide' ) &&
		( settings.modules || [] ).every( ( name ) =>
			settings.motionOnly?.includes( name )
		);
	if ( crossfade ) {
		params.effect = 'fade';
		params.fadeEffect = { crossFade: true };
		params.speed = Math.max( Number( params.speed ) || 0, CALM_SPEED );
	}
	const calmSpeed = Math.max( Number( params.speed ) || 0, CALM_SPEED );
	if ( MODULES[ params.effect ] ) {
		wanted.push( params.effect );
	}
	// The view modules the slider names: each gets the slider and its
	// parameters and may return Swiper modules (`modules`), event handlers
	// (`on`), parameters to set after the slider's own (`params`) and the
	// pagination for a slider with clones (`pagination`, as
	// realPagination()).
	const context = {
		el,
		win,
		params,
		settings,
		state,
		reducedMotion: calm,
	};
	const [ Swiper, extensions, ...modules ] = await Promise.all( [
		loadSwiper(),
		Promise.all(
			// A module only for motion (a WebGL effect) is not even
			// fetched under reduced motion.
			( settings.modules || [] )
				.filter(
					( name ) =>
						! context.reducedMotion ||
						! settings.motionOnly?.includes( name )
				)
				.map( ( name ) =>
					loadModule( name ).then( ( m ) =>
						m?.default ? m.default( context ) : null
					)
				)
		).then( ( list ) => list.filter( Boolean ) ),
		...wanted.map( ( name ) => MODULES[ name ]().then( firstExport ) ),
	] );
	const on = {};
	for ( const extension of extensions ) {
		modules.push( ...( extension.modules || [] ) );
		for ( const [ event, handler ] of Object.entries(
			extension.on || {}
		) ) {
			const before = on[ event ];
			on[ event ] = before
				? ( ...args ) => {
						before( ...args );
						handler( ...args );
					}
				: handler;
		}
	}

	// Elements instead of the selectors 6.x printed: ids may repeat.
	params.navigation = wanted.includes( 'navigation' ) && {
		nextEl: el.querySelector( '.eedee-gutenslider-next' ),
		prevEl: el.querySelector( '.eedee-gutenslider-prev' ),
	};
	const realCount = fillLoop( el, params );
	let paginate = null;
	const paginationEl = el.querySelector( '.eedee-gutenslider-pagination' );
	if ( ! wanted.includes( 'pagination' ) ) {
		params.pagination = false;
	} else if ( realCount ) {
		const build =
			extensions.find( ( e ) => e.pagination )?.pagination ||
			realPagination;
		paginate = build(
			paginationEl,
			params.pagination || {},
			realCount,
			params.direction,
			params.a11y?.paginationBulletMessage
		);
		params.pagination = false;
	} else {
		paginationEl.classList.remove( 'swiper-pagination-custom' );
		params.pagination = { ...params.pagination, el: paginationEl };
	}
	for ( const extension of extensions ) {
		Object.assign( params, extension.params || {} );
	}
	if ( calm && ! crossfade ) {
		params.speed = 0;
		// Without a transition there is no transitionend, which autoplay
		// otherwise waits for after each change: it would stop after one.
		if ( params.autoplay ) {
			params.autoplay = { ...params.autoplay, waitForTransition: false };
		}
	}

	for ( const key of [
		'settingsMd',
		'settingsLg',
		'hasLg',
		'hasLgCounter',
		'isFullScreen',
		'lgTitle',
		'lgCaption',
		'lgThumbnails',
		'lgOpen',
		'dividers',
		'randomOrder',
		'modules',
		'motionOnly',
		'loopFactor',
	] ) {
		delete params[ key ];
	}

	state.youtube?.();
	state.swiperInstance?.destroy( true, true );
	// Swiper checks `instanceof HTMLElement` against the script's window; in
	// the editor the slider lives in an iframe with its own.
	const { HTMLElement } = window;
	window.HTMLElement = win.HTMLElement;
	let swiper;
	try {
		swiper = new Swiper( el.querySelector( '.swiper' ), {
			...params,
			modules,
			on: {
				...on,
				afterInit( s ) {
					onSlide( s );
					paginate?.( s );
					on.afterInit?.( s );
				},
				slideChangeTransitionStart( s ) {
					onSlide( s );
					on.slideChangeTransitionStart?.( s );
				},
				// The visible classes are final once the slides stand.
				slideChangeTransitionEnd( s ) {
					onSlide( s );
					on.slideChangeTransitionEnd?.( s );
				},
				realIndexChange( s ) {
					paginate?.( s );
					on.realIndexChange?.( s );
				},
			},
		} );
	} finally {
		window.HTMLElement = HTMLElement;
	}
	if ( calm && ! crossfade ) {
		fadeThrough( swiper, calmSpeed );
	}
	state.swiperInstance = swiper;
	state.youtube?.();
	state.youtube = null;
	state.destroy = () => {
		state.youtube?.();
		swiper.destroy( true, true );
	};
	// Video slides from links (.gs-yt: 7.0 betas), and the shared sound of
	// <video> slides.
	if (
		el.querySelector( '.gs-embed, .gs-yt, .eedee-background-div video' )
	) {
		import( /* webpackChunkName: "embeds" */ './embeds' )
			.then( async ( { default: embeds, adapters } ) => [
				embeds,
				await adapters( el, loadModule ),
			] )
			.then( ( [ embeds, players ] ) => {
				if ( state.swiperInstance === swiper && ! swiper.destroyed ) {
					state.youtube = embeds( el, swiper, players );
				}
			} );
	}

	el.classList.toggle( 'adaptive-height', !! params.autoHeight );
	el.classList.toggle( 'fixed-height', ! params.autoHeight );
	el.classList.add( 'gs-finished-layout', 'gs-finished-controls' );
	el.dispatchEvent(
		new win.CustomEvent( 'gutenslider:init', { detail: state } )
	);
}
