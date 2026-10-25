/**
 * Preview in the editor: a copy of the slider as the front end prints it,
 * run by the front end's own script (mount.js) – effects, autoplay, loop,
 * pagination. The editable slider stays mounted, hidden.
 */
import { sliderClasses, sliderSettings, sliderVars } from './markup';

const EDITOR_ONLY = [
	'.block-list-appender',
	'.block-editor-button-block-appender',
	'.block-editor-inserter',
	'.block-editor-block-list__insertion-point',
	'[data-rich-text-placeholder]',
	'.gutenslider-badge',
	'.gutenslider-editor-nav',
	'.gutenslider-is-hidden',
].join( ',' );

const EDITOR_STATES = [
	'is-selected',
	'has-child-selected',
	'is-hovered',
	'is-highlighted',
	'is-multi-selected',
	'is-editing-disabled',
];

/**
 * Builds the front-end markup from the editor's slider and starts Swiper.
 *
 * @param {HTMLElement} host       Where the preview goes.
 * @param {HTMLElement} source     The editor's .eedee-swiper-outer.
 * @param {Object}      attributes Slider attributes.
 * @param {string}      className  The block's own classes (align, custom).
 * @return {Function} Stops and removes the preview.
 */
export function startPreview( host, source, attributes, className ) {
	const doc = host.ownerDocument;
	const root = doc.createElement( 'div' );
	root.className = [
		'wp-block-eedee-block-gutenslider',
		'gs-frontend',
		'gs-preview',
		className,
		...sliderClasses( attributes ),
	]
		.filter( Boolean )
		.join( ' ' );
	root.dataset.settings = JSON.stringify( sliderSettings( attributes ) );

	const outer = source.cloneNode( true );
	outer.classList.remove( 'gs-editing' );
	// The editing copy is hidden while the preview shows.
	outer.removeAttribute( 'hidden' );
	outer.querySelectorAll( EDITOR_ONLY ).forEach( ( n ) => n.remove() );
	outer
		.querySelectorAll( '[contenteditable]' )
		.forEach( ( n ) => n.removeAttribute( 'contenteditable' ) );
	outer.querySelectorAll( '[data-block], [id]' ).forEach( ( n ) => {
		n.removeAttribute( 'data-block' );
		n.removeAttribute( 'id' );
		n.removeAttribute( 'tabindex' );
		n.classList.remove( ...EDITOR_STATES );
	} );
	const wrapper = outer.querySelector( '.swiper-wrapper' );
	wrapper.removeAttribute( 'style' );
	wrapper.className = 'swiper-wrapper';

	// Fixed content: out of the slides, into its own layer (as rendered).
	const vars = sliderVars( attributes );
	if ( attributes.contentMode === 'fixed' ) {
		const content = doc.createElement( 'div' );
		content.className = `wp-block-eedee-gutenslider__content co-${ attributes.contentOpacity ?? 1 }`;
		[ ...wrapper.children ]
			.filter( ( n ) => ! n.classList.contains( 'swiper-slide' ) )
			.forEach( ( n ) => content.append( n ) );
		outer.append( content );
		outer.removeAttribute( 'style' );
		Object.entries( vars ).forEach( ( [ k, v ] ) =>
			root.style.setProperty( k, v )
		);
	} else {
		[ ...wrapper.children ]
			.filter( ( n ) => ! n.classList.contains( 'swiper-slide' ) )
			.forEach( ( n ) => n.remove() );
	}
	// Slides as the front end has them: no editor wrapper around the blocks.
	wrapper.querySelectorAll( ':scope > .swiper-slide' ).forEach( ( slide ) => {
		slide.style.removeProperty( '--gs-i' );
		slide.removeAttribute( 'data-gs-index' );
		slide.classList.remove(
			...[ ...slide.classList ].filter(
				( c ) =>
					c.startsWith( 'block-editor' ) ||
					c === 'wp-block' ||
					EDITOR_STATES.includes( c )
			)
		);
		const blocks = slide.querySelector(
			'.slide-content > .gutenslider-slide-blocks'
		);
		if ( blocks ) {
			blocks.replaceWith( ...blocks.childNodes );
		}
	} );
	root.append( outer );

	// Links do not leave the editor.
	root.addEventListener(
		'click',
		( e ) => e.target.closest( 'a' ) && e.preventDefault(),
		true
	);

	host.replaceChildren( root );
	let stopped = false;
	import( /* webpackChunkName: "editor-preview" */ './mount' ).then(
		( { mount, setViewModules } ) => {
			setViewModules( window.eedeeGutenslider?.modules );
			return ! stopped && mount( root );
		}
	);

	return () => {
		stopped = true;
		root.gutenslider?.destroy?.();
		host.replaceChildren();
	};
}
