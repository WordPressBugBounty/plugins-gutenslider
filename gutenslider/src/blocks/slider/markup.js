/**
 * The slider's and slide's classes, custom properties and settings, as
 * includes/class-render.php prints them. The editor canvas uses the same
 * ones, so it looks like the front end with the same stylesheet, and the
 * Preview can run the front end's own script on it.
 *
 * Keep in sync with Render::slider(), Render::settings() and Render::slide().
 * What another plugin adds there (PHP filters) it adds here with the
 * `gutenslider.slider.classes`, `.vars` and `.settings` filters.
 */
import { applyFilters } from '@wordpress/hooks';

export const POSITIONS = {
	'top left': 'is-position-top-left',
	'top center': 'is-position-top-center',
	'top right': 'is-position-top-right',
	'center left': 'is-position-center-left',
	'center center': 'is-position-center-center',
	center: 'is-position-center-center',
	'center right': 'is-position-center-right',
	'bottom left': 'is-position-bottom-left',
	'bottom center': 'is-position-bottom-center',
	'bottom right': 'is-position-bottom-right',
};

/** What an effect description has, unless it says otherwise (Render). */
const EFFECT_DEFAULTS = {
	single: false,
	stacked: false,
	centered: false,
	gap: true,
	placement: true,
	dividers: true,
	base: '',
	module: '',
	motion: false,
	settings: {},
};

const effects = () =>
	window.eedeeGutenslider?.effects || {
		slide: {},
		fade: { single: true, stacked: true },
		flip: { single: true, stacked: true, dividers: false },
	};

/**
 * How an effect lays out the slides (Render::effects()).
 *
 * @param {string} animation `animation` value.
 * @return {Object} Description.
 */
export function effectOf( animation ) {
	const all = effects();
	return { ...EFFECT_DEFAULTS, ...( all[ animation ] || all.slide ) };
}

/**
 * The attributes the front end renders with: an effect nothing draws
 * renders as "slide" (Render::slider()).
 *
 * @param {Object} attr Slider attributes.
 * @return {Object} Attributes.
 */
export function rendered( attr ) {
	return effects()[ attr.animation ] ? attr : { ...attr, animation: 'slide' };
}

const UNSAFE = /[;{}<>"\\]|\/\*|url\s*\(|expression\s*\(/i;

/**
 * A CSS value from an attribute, or the fallback (as Render::css()).
 *
 * @param {*}      value    Attribute value.
 * @param {string} fallback Fallback.
 * @return {string} CSS value.
 */
export function css( value, fallback = '' ) {
	if (
		value === null ||
		value === undefined ||
		typeof value === 'boolean' ||
		typeof value === 'object'
	) {
		return fallback;
	}
	const v = String( value ).trim();
	return v === '' || UNSAFE.test( v ) ? fallback : v;
}

const num = ( value, fallback = 0 ) => {
	const n = Number( value );
	return value !== '' && value !== null && Number.isFinite( n )
		? String( n )
		: String( fallback );
};

/**
 * Swiper's slidesPerView for one breakpoint ('auto' for 0).
 *
 * @param {Object} attr   Slider attributes.
 * @param {*}      slides slidesToShow value.
 * @return {number|string} Slides per view.
 */
export function perView( attr, slides ) {
	if ( effectOf( attr.animation ).single ) {
		return 1;
	}
	if ( String( slides ) === '0' ) {
		return 'auto';
	}
	return Math.max( 1, Number( slides ) || 1 );
}

const cls = ( value ) => String( value ?? '' ).replace( /[^A-Za-z0-9_-]/g, '' );

/**
 * The block gap as [vertical, horizontal] (Render::block_gap()).
 *
 * @param {Object} attr Slider attributes.
 * @return {string[]} Gap values.
 */
function blockGap( attr ) {
	const fallback =
		'var( --wp--style--gallery-gap-default, var( --gallery-block--gutter-size, var( --wp--style--block-gap, 0.5em ) ) )';
	const resolve = ( value ) => {
		if ( typeof value !== 'string' || value === '' ) {
			return fallback;
		}
		if ( value.startsWith( 'var:preset|spacing|' ) ) {
			return `var(--wp--preset--spacing--${ value.slice( value.lastIndexOf( '|' ) + 1 ) })`;
		}
		const v = css( value, fallback );
		return v === '0' ? '0px' : v;
	};
	const gap = attr.style?.spacing?.blockGap;
	if ( gap && typeof gap === 'object' ) {
		return [ resolve( gap.top ), resolve( gap.left ) ];
	}
	const v = resolve( gap );
	return [ v, v ];
}

/**
 * The slider's classes (without WordPress's own block classes).
 *
 * @param {Object} input Slider attributes.
 * @return {string[]} Classes.
 */
export function sliderClasses( input ) {
	const attr = rendered( input );
	const effect = effectOf( attr.animation );
	const perSm = perView( attr, attr.slidesToShowSm );
	const c = [ `content-${ cls( attr.contentMode ) }` ];
	[
		[ 'adaptiveHeight', 'adaptive-height' ],
		[ 'adaptiveHeightMd', 'adaptive-height-md' ],
		[ 'adaptiveHeightSm', 'adaptive-height-sm' ],
	].forEach( ( [ key, name ] ) => attr[ key ] && c.push( name ) );
	if ( attr.isFullScreen ) {
		c.push( 'is-full' );
	}
	c.push(
		cls( attr.arrowStyle ),
		cls( attr.arrowPosition ),
		`arrow-mb-${ cls( attr.arrowMixBlendMode ) }`
	);
	[
		[ '', 'lg' ],
		[ 'Md', 'md' ],
		[ 'Sm', 'sm' ],
	].forEach( ( [ s, size ] ) =>
		c.push(
			attr[ `arrows${ s }` ]
				? `arrows-${ size }`
				: `arrows-${ size }-none`
		)
	);
	c.push( cls( attr.dotStyle ) );
	[
		[ '', 'lg' ],
		[ 'Md', 'md' ],
		[ 'Sm', 'sm' ],
	].forEach( ( [ s, size ] ) =>
		c.push(
			attr[ `dots${ s }` ] ? `dots-${ size }` : `dots-${ size }-none`
		)
	);
	c.push( cls( attr.dotPosition ) );
	if ( POSITIONS[ attr.contentPosition ] ) {
		c.push( POSITIONS[ attr.contentPosition ] );
	}
	[
		[ 'visibleOnDesktop', 'ed-desktop-hidden' ],
		[ 'visibleOnTablet', 'ed-tablet-hidden' ],
		[ 'visibleOnMobile', 'ed-mobile-hidden' ],
	].forEach( ( [ key, name ] ) => attr[ key ] === false && c.push( name ) );
	c.push( `mb-${ cls( attr.mixBlendMode ) }` );
	if ( attr.wrapAutoHeight ) {
		c.push( 'wrap-auto-height' );
	}
	// Auto width or a number per breakpoint (the styles use these); the 6.x
	// class, from the mobile value, stays for custom CSS.
	c.push( perSm === 'auto' ? 'slides-auto' : 'slides-number' );
	[
		[ 'sm', perSm ],
		[ 'md', perView( attr, attr.slidesToShowMd ) ],
		[ 'lg', perView( attr, attr.slidesToShow ) ],
	].forEach( ( [ band, per ] ) =>
		c.push(
			`${ per === 'auto' ? 'slides-auto' : 'slides-number' }-${ band }`
		)
	);
	c.push( `effect-${ cls( attr.animation ) }` );
	if ( effect.base ) {
		c.push( `effect-${ cls( effect.base ) }` );
	}
	if ( effect.single ) {
		c.push( 'gs-single' );
	}
	if ( effect.stacked ) {
		c.push( 'gs-stacked' );
	}
	// The centered first-paint offset only applies where the slides are a
	// number per view (layout.scss).
	if ( attr.centeredSlides || effect.centered ) {
		c.push( 'gs-centered' );
	}
	if ( attr.hasLg ) {
		c.push( 'gs-has-lightbox' );
	}
	// The slide's blocks below or above the image (per-slide content only).
	if (
		attr.contentMode !== 'fixed' &&
		[ 'below', 'above' ].includes( attr.contentPlacement ) &&
		effect.placement
	) {
		c.push( `gs-content-${ attr.contentPlacement }` );
	}
	// The blocks line up with the theme's wide or content width.
	if ( [ 'wide', 'content' ].includes( attr.contentWidth ) ) {
		c.push( `gs-content-width-${ attr.contentWidth }` );
	}
	return applyFilters(
		'gutenslider.slider.classes',
		c.filter( Boolean ),
		attr
	);
}

/**
 * The slider's custom properties (set on .eedee-swiper-outer, or on the
 * block in "fixed content" mode).
 *
 * @param {Object} input Slider attributes.
 * @return {Object} Custom properties.
 */
export function sliderVars( input ) {
	const attr = rendered( input );
	const [ gapV, gapH ] = blockGap( attr );
	const d = attr.dividers || {};
	const noGap = ! effectOf( attr.animation ).gap;
	const vars = {
		'--gutenslider-min-height': css( attr.sliderHeight, '50vh' ),
		'--gutenslider-min-height-md': css( attr.sliderHeightMd, '50vh' ),
		'--gutenslider-min-height-sm': css( attr.sliderHeightSm, '50vh' ),
		'--gutenslider-arrow-size': `${ num( attr.arrowSize, 30 ) }px`,
		'--gutenslider-arrow-size-md': `${ num( attr.arrowSizeMd, 30 ) }px`,
		'--gutenslider-arrow-size-sm': `${ num( attr.arrowSizeSm, 30 ) }px`,
		'--gutenslider-dot-size': `${ num( attr.dotSize, 25 ) }px`,
		'--gutenslider-dot-size-md': `${ num( attr.dotSizeMd, 25 ) }px`,
		'--gutenslider-dot-size-sm': `${ num( attr.dotSizeSm, 25 ) }px`,
		'--gutenslider-arrow-color': css( attr.arrowColor, '#fff' ),
		'--gutenslider-dot-color': css( attr.dotColor, '#fff' ),
		'--gutenslider-arrow-bg-color': css( attr.arrowBgColor, 'transparent' ),
		'--gutenslider-arrow-hover-color': css( attr.arrowHoverColor, '#eee' ),
		'--gutenslider-arrow-bg-hover-color': css(
			attr.arrowBgHoverColor,
			'transparent'
		),
		'--gutenslider-arrow-x-offset': `${ num( attr.arrowXOffset ) }px`,
		'--gutenslider-arrow-x-offset-md': `${ num( attr.arrowXOffsetMd ) }px`,
		'--gutenslider-arrow-x-offset-sm': `${ num( attr.arrowXOffsetSm ) }px`,
		'--gutenslider-arrow-y-offset': `${ num( attr.arrowYOffset ) }px`,
		'--gutenslider-arrow-y-offset-md': `${ num( attr.arrowYOffsetMd ) }px`,
		'--gutenslider-arrow-y-offset-sm': `${ num( attr.arrowYOffsetSm ) }px`,
		'--gutenslider-arrow-x-spacing': `${ num( attr.arrowXSpacing ) }px`,
		'--gutenslider-dot-y-offset': `${ num( attr.dotYOffset ) }px`,
		'--gutenslider-dot-y-offset-md': `${ num( attr.dotYOffsetMd ) }px`,
		'--gutenslider-dot-y-offset-sm': `${ num( attr.dotYOffsetSm ) }px`,
		'--gutenslider-padding-x': css( attr.paddingX, '40px' ),
		'--gutenslider-padding-x-md': css( attr.paddingXMd, '40px' ),
		'--gutenslider-padding-x-sm': css( attr.paddingXSm, '20px' ),
		'--gutenslider-padding-y': css( attr.paddingY, '40px' ),
		'--gutenslider-padding-y-md': css( attr.paddingYMd, '40px' ),
		'--gutenslider-padding-y-sm': css( attr.paddingYSm, '20px' ),
		'--gutenslider-margin-x': css( attr.marginX, '0px' ),
		'--gutenslider-margin-x-md': css( attr.marginXMd, '0px' ),
		'--gutenslider-margin-x-sm': css( attr.marginXSm, '0px' ),
		'--gutenslider-margin-y': css( attr.marginY, '0px' ),
		'--gutenslider-margin-y-md': css( attr.marginYMd, '0px' ),
		'--gutenslider-margin-y-sm': css( attr.marginYSm, '0px' ),
		'--gutenslider-divider-top': `${ num( d.top?.height ?? 60, 60 ) }px`,
		'--gutenslider-divider-bottom': `${ num( d.bottom?.height ?? 60, 60 ) }px`,
		'--gutenslider-lightgallery-bg': css( attr.lgBgColor, '#fff' ),
		'--gutenslider-lightgallery-font': css( attr.lgFontColor, '#000' ),
		'--gs-first-pos': css( attr.bgImagePos, '50% 50%' ),
		'--gs-gap-vertical': gapV,
		'--gs-gap-horizontal': gapH,
		'--gs-per-view': String( perView( attr, attr.slidesToShow ) ),
		'--gs-per-view-md': String( perView( attr, attr.slidesToShowMd ) ),
		'--gs-per-view-sm': String( perView( attr, attr.slidesToShowSm ) ),
		'--gs-space': `${ noGap ? 0 : parseInt( attr.spaceBetween, 10 ) || 0 }px`,
		'--gs-space-md': `${ noGap ? 0 : parseInt( attr.spaceBetweenMd, 10 ) || 0 }px`,
		'--gs-space-sm': `${ noGap ? 0 : parseInt( attr.spaceBetweenSm, 10 ) || 0 }px`,
		'--gs-speed': `${ num( attr.fadeSpeed, 0.7 ) }s`,
	};
	return applyFilters( 'gutenslider.slider.vars', vars, attr );
}

/**
 * Swiper settings in the shape of data-settings (Render::settings()).
 *
 * @param {Object} input Slider attributes.
 * @return {Object} Settings.
 */
export function sliderSettings( input ) {
	const attr = rendered( input );
	const effect = effectOf( attr.animation );
	const space = ( value ) => ( effect.gap ? parseInt( value, 10 ) || 0 : 0 );
	const [ lg, md, sm ] = [
		attr.slidesToShow,
		attr.slidesToShowMd,
		attr.slidesToShowSm,
	].map( ( v ) => perView( attr, v ) );
	const d = attr.dividers || {};
	const settings = {
		autoplay: attr.autoplay
			? {
					delay: Math.round( Number( attr.duration ) * 1000 ),
					pauseOnMouseEnter: !! attr.pauseOnHover,
					disableOnInteraction: ! attr.pauseOnHover,
				}
			: false,
		speed: Math.round( Number( attr.fadeSpeed ) * 1000 ),
		direction: 'horizontal',
		autoHeight: !! attr.adaptiveHeightSm,
		loop: !! attr.loop,
		centeredSlides: !! attr.centeredSlides || effect.centered,
		spaceBetween: space( attr.spaceBetweenSm ),
		slidesPerView: sm,
		slidesPerGroup: Math.max(
			1,
			parseInt( attr.slidesToScrollSm, 10 ) || 1
		),
		effect: cls( effect.base || attr.animation ),
		fadeEffect: { crossFade: true },
		pagination: {
			type: 'bullets',
			clickable: true,
		},
		watchSlidesProgress: true,
		settingsMd: {
			autoHeight: !! attr.adaptiveHeightMd,
			slidesPerView: md,
			slidesPerGroup: Math.max(
				1,
				parseInt( attr.slidesToScrollMd, 10 ) || 1
			),
			spaceBetween: space( attr.spaceBetweenMd ),
			loop: !! attr.loop,
		},
		settingsLg: {
			autoHeight: !! attr.adaptiveHeight,
			slidesPerView: lg,
			slidesPerGroup: Math.max(
				1,
				parseInt( attr.slidesToScroll, 10 ) || 1
			),
			spaceBetween: space( attr.spaceBetween ),
			loop: !! attr.loop,
		},
		hasLg: false,
		isFullScreen: !! attr.isFullScreen,
		keyboard: false,
		hashNavigation: false,
		dividers:
			( d.top?.value ?? 'none' ) !== 'none' ||
			( d.bottom?.value ?? 'none' ) !== 'none',
	};
	// Only when on, as Render::settings().
	if ( attr.randomOrder ) {
		settings.randomOrder = true;
	}
	if ( effect.module ) {
		settings.modules = [ effect.module ];
		if ( effect.motion ) {
			settings.motionOnly = [ effect.module ];
		}
	}
	Object.assign( settings, effect.settings );
	return applyFilters( 'gutenslider.slider.settings', settings, attr );
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The video id of a YouTube link (watch, youtu.be, shorts, embed, live), as
 * YouTube::video_id() reads it.
 *
 * @param {string} url Link or id.
 * @return {string} Id, or ''.
 */
export function youtubeId( url = '' ) {
	const value = String( url ).trim();
	if ( YT_ID.test( value ) ) {
		return value;
	}
	const m =
		value.match( /youtu\.be\/([A-Za-z0-9_-]{11})/ ) ||
		value.match(
			/youtube(?:-nocookie)?\.com\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/
		) ||
		value.match( /youtube\.com\/.*[?&]v=([A-Za-z0-9_-]{11})/ );
	return m ? m[ 1 ] : '';
}

/**
 * The YouTube id of a saved slide video (YouTube::of()).
 *
 * @param {Object} video backgroundVideo.
 * @return {string} Id, or ''.
 */
export function youtubeOf( video = {} ) {
	if ( video.provider === 'youtube' && YT_ID.test( video.id || '' ) ) {
		return video.id;
	}
	return video.embed ? youtubeId( video.url ) : '';
}

let embedPatterns = null;

/**
 * Video ids by provider (Embed::providers()), compiled once. A pattern
 * JavaScript can't read is left out: that provider's videos show as
 * without a player.
 *
 * @return {Object} Regular expressions by provider.
 */
const embedIds = () => {
	if ( ! embedPatterns ) {
		embedPatterns = { youtube: YT_ID };
		for ( const [ provider, pattern ] of Object.entries(
			window.eedeeGutenslider?.providers || {}
		) ) {
			try {
				embedPatterns[ provider ] = new RegExp( ...pattern );
			} catch {}
		}
		embedPatterns.youtube = YT_ID;
	}
	return embedPatterns;
};

/**
 * The player of a saved slide video (Embed::of()): { provider, id, hash },
 * or null for a file.
 *
 * @param {Object} video backgroundVideo.
 * @return {Object|null} Embed.
 */
export function embedOf( video = {} ) {
	if ( embedIds()[ video.provider ]?.test( video.id || '' ) ) {
		return {
			provider: video.provider,
			id: video.id,
			hash: /^[0-9a-f]{6,20}$/.test( video.hash || '' ) ? video.hash : '',
		};
	}
	const id = youtubeOf( video );
	return id ? { provider: 'youtube', id, hash: '' } : null;
}

/**
 * The slide's classes and style (Render::slide()), plus its overlay.
 *
 * @param {Object} attr    Slide attributes.
 * @param {Object} context Block context (the slider's videoAutoplay).
 * @return {Object} { classes, style, overlay, image, video, embed, type }.
 */
export function slideParts( attr, context = {} ) {
	const bg =
		attr.background &&
		typeof attr.background === 'object' &&
		! Array.isArray( attr.background )
			? attr.background
			: {};
	const type = bg.backgroundType || 'color';
	const image =
		bg.backgroundImage && typeof bg.backgroundImage === 'object'
			? bg.backgroundImage
			: {};
	const video =
		bg.backgroundVideo && typeof bg.backgroundVideo === 'object'
			? bg.backgroundVideo
			: {};
	const overlayImage = bg.backgroundOverlayImage || '';
	const overlayVideo = bg.backgroundOverlayVideo || '';

	const classes = [ 'swiper-slide' ];
	if ( POSITIONS[ attr.contentPosition ] ) {
		classes.push( POSITIONS[ attr.contentPosition ] );
	}
	const typeClass = {
		image: 'ed-bg-image',
		none: 'ed-bg-none',
		video: 'ed-bg-video',
		gradient: 'ed-bg-gradient',
		color: 'ed-bg-color',
	}[ type ];
	if ( typeClass ) {
		classes.push( typeClass );
	}
	const style = {};
	if ( [ 'color', 'gradient', 'none' ].includes( type ) && attr.minWidth ) {
		style[ '--slide-min-width' ] = css( attr.minWidth, '80%' );
	}

	let kind = '';
	if (
		type === 'color' ||
		overlayImage === 'color' ||
		overlayVideo === 'color'
	) {
		kind = 'color';
	} else if (
		type === 'gradient' ||
		overlayImage === 'gradient' ||
		overlayVideo === 'gradient'
	) {
		kind = 'gradient';
	}
	const overlaid =
		[ 'color', 'gradient' ].includes( overlayImage ) ||
		[ 'color', 'gradient' ].includes( overlayVideo );
	const overlay = {
		opacity: overlaid
			? Math.max(
					0,
					Math.min( 100, Number( bg.backgroundOverlayOpacity ?? 50 ) )
				) / 100
			: 1,
	};
	let value = '';
	if ( kind === 'color' ) {
		value = css( bg.backgroundColor ?? '#fffa' );
	} else if (
		kind === 'gradient' &&
		typeof bg.backgroundGradient === 'string'
	) {
		value = css( bg.backgroundGradient );
	}
	if ( value ) {
		overlay.background = value;
	}

	const showsImage =
		type === 'image' ||
		( type === 'color' && overlayImage === 'color' ) ||
		( type === 'gradient' && overlayImage === 'gradient' );
	const showsVideo =
		type === 'video' ||
		( type === 'color' && overlayVideo === 'color' ) ||
		( type === 'gradient' && overlayVideo === 'gradient' );
	const fit = ( v ) =>
		[ 'cover', 'contain', 'fill', 'none', 'scale-down' ].includes( v )
			? v
			: 'cover';
	const position = ( fp ) =>
		`${ Math.round( ( fp?.x ?? 0.5 ) * 10000 ) / 100 }% ${ Math.round( ( fp?.y ?? 0.5 ) * 10000 ) / 100 }%`;

	// Video autoplay: the slide's own setting, else the slider's.
	const autoplay =
		typeof bg.backgroundVideoAutoplay === 'boolean'
			? bg.backgroundVideoAutoplay
			: context[ 'gutenslider/videoAutoplay' ] !== false;
	const embed = showsVideo ? embedOf( video ) : null;
	// A video from a platform with no player here shows its poster.
	const noPlayer =
		showsVideo &&
		! embed &&
		! [ undefined, '', 'file' ].includes( video.provider );
	// No saved poster: YouTube's own thumbnail, else the play button on black.
	let poster = image.url ? image : null;
	if ( embed?.provider === 'youtube' && ! poster ) {
		poster = {
			url: `https://i.ytimg.com/vi/${ embed.id }/hqdefault.jpg`,
			width: 480,
			height: 360,
		};
	}
	if ( embed ) {
		classes.push( 'ed-bg-embed', `ed-bg-${ embed.provider }` );
		const w = Number( video.width ) || 1920;
		const h = Number( video.height ) || 1080;
		style[ '--ed-vw' ] = w;
		style[ '--ed-vh' ] = h;
	}

	return {
		type,
		classes,
		style,
		overlay,
		embed: embed
			? {
					...embed,
					title: video.title || '',
					ratio:
						Math.round(
							( ( Number( video.width ) || 1920 ) /
								( Number( video.height ) || 1080 ) ) *
								10000
						) / 10000,
					cover: bg.backgroundVideoSize === 'cover',
					poster,
					options: {
						autoplay,
						muted: bg.backgroundVideoMuted !== false,
						loop: bg.backgroundVideoLoop !== false,
						controls: bg.backgroundVideoControls !== false,
						...( embed.hash ? { hash: embed.hash } : {} ),
					},
				}
			: null,
		image:
			! embed && ( showsImage || noPlayer ) && image.url
				? {
						...image,
						fit: fit( bg.backgroundImageSize ),
						position: position( bg.backgroundFocalPoint ),
					}
				: null,
		video:
			! embed &&
			! noPlayer &&
			! ( showsImage && image.url ) &&
			showsVideo &&
			video.url
				? {
						...video,
						fit: fit( bg.backgroundVideoSize ),
						position: position( bg.backgroundVideoFocalPoint ),
						poster: image.url,
						loop: bg.backgroundVideoLoop !== false,
						muted: bg.backgroundVideoMuted !== false,
						autoplay,
					}
				: null,
	};
}
