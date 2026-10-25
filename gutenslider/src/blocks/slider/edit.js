/**
 * The slider block in the editor.
 *
 * Edit mode: the slider as visitors see it before Swiper runs (same classes,
 * custom properties and stylesheet), with the slides editable in place. The
 * arrows and dots page through the slides, and selecting a slide (on the
 * canvas or in List View) brings it into view. No Swiper here: it would
 * fight the editor for the slides.
 *
 * Preview mode: the front end's own script runs on a copy (preview.js).
 *
 * Nothing is written when a slider is opened, except a missing or duplicate
 * gsBlockId (it names the slider's element): old content stays as saved.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	BlockControls,
	MediaPlaceholder,
	MediaUpload,
	MediaUploadCheck,
	useBlockProps,
	useInnerBlocksProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalBlockAlignmentMatrixControl as BlockAlignmentMatrixControl,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Button, ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect, useRegistry } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { plus, image as imageIcon, video as videoIcon } from '@wordpress/icons';

import SliderInspector from './inspector';
import {
	POSITIONS,
	effectOf,
	perView,
	rendered,
	sliderClasses,
	sliderVars,
} from './markup';
import { applyFilters } from '@wordpress/hooks';
import { applyCaptions } from './captions';
import { startPreview } from './preview';
import { pickMedia } from '../slide/background';
import {
	AddVideosModal,
	addedMessage,
	videoBackground,
} from '../slide/video-links';
import icons from '../icons';

const SLIDE = 'eedee/block-gutenslide';

const data = () => window.eedeeGutenslider || {};

/**
 * A new slide: from a Media Library item, or empty (light color).
 *
 * @param {Object|null} media           Media item.
 * @param {string}      contentPosition Content position of the slider.
 * @return {Object} Block.
 */
export function newSlide( media, contentPosition = 'center center' ) {
	const common = {
		backgroundOverlayImage: '',
		backgroundOverlayVideo: '',
		backgroundOverlayOpacity: 50,
		backgroundImageSize: 'cover',
		backgroundVideoSize: 'cover',
		backgroundFocalPoint: { x: 0.5, y: 0.5 },
		backgroundVideoFocalPoint: { x: 0.5, y: 0.5 },
		backgroundVideoMuted: true,
		backgroundVideoLoop: true,
		backgroundVideoPauseWhenInactive: true,
		backgroundColor: '#eeeeee',
		backgroundImage: {},
		backgroundVideo: {},
	};
	if ( ! media ) {
		return createBlock(
			SLIDE,
			{
				contentPosition,
				background: { ...common, backgroundType: 'color' },
			},
			[
				createBlock( 'core/paragraph', {
					placeholder: __( 'Slide text…', 'gutenslider' ),
				} ),
			]
		);
	}
	// `videoLink`, not `link`: every Media Library item has a `link` (its
	// attachment page).
	if ( media.videoLink ) {
		return createBlock( SLIDE, {
			contentPosition,
			background: { ...common, ...videoBackground( media.videoLink ) },
		} );
	}
	const item = pickMedia( media );
	const video =
		item.type === 'video' || String( item.mime ).startsWith( 'video/' );
	return createBlock( SLIDE, {
		contentPosition,
		background: {
			...common,
			backgroundType: video ? 'video' : 'image',
			[ video ? 'backgroundVideo' : 'backgroundImage' ]: video
				? { ...item, embed: false }
				: item,
		},
	} );
}

/**
 * The block's arrows, as the front end prints them.
 *
 * @param {string} style arrowStyle.
 * @return {Object} { prev, next } SVG markup.
 */
function arrowSvgs( style ) {
	const arrows = data().arrows || [];
	const found =
		arrows.find( ( a ) => a.value === style ) || arrows[ 0 ] || {};
	return { prev: found.prev || '', next: found.next || '' };
}

function Divider( { attributes, side } ) {
	const d = attributes.dividers?.[ side ] || {};
	const shape = ( data().gutensliderDividers || {} )[ d.value ];
	if (
		! d.value ||
		d.value === 'none' ||
		! shape?.svg ||
		! effectOf( rendered( attributes ).animation ).dividers
	) {
		return null;
	}
	const inverted = d.inverted && shape[ 'svg-inverted' ];
	return (
		<div
			className={ [
				`gutenslider-divider-${ side }`,
				inverted && 'inverted',
				d.flipY && 'flip-y',
			]
				.filter( Boolean )
				.join( ' ' ) }
			style={ { color: d.color || '#fff' } }
			aria-hidden="true"
			dangerouslySetInnerHTML={ {
				__html: inverted ? shape[ 'svg-inverted' ] : shape.svg,
			} }
		/>
	);
}

/**
 * The dots, for the current slide; another pagination when a filter
 * (`gutenslider.pagination`) gives one.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes Slider attributes.
 * @param {number}   props.count      Slides.
 * @param {number}   props.current    Current index.
 * @param {Function} props.go         Go to a slide.
 */
function Pagination( { attributes, count, current, go } ) {
	const base = 'eedee-gutenslider-pagination swiper-pagination-horizontal';
	const other = applyFilters( 'gutenslider.pagination', null, {
		attributes,
		count,
		current,
		go,
		className: base,
	} );
	if ( other ) {
		return other;
	}
	return (
		<div
			className={ `${ base } swiper-pagination-bullets swiper-pagination-clickable` }
		>
			{ Array.from( { length: count }, ( _, i ) => (
				<span
					key={ i }
					role="button"
					tabIndex={ -1 }
					className={ `swiper-pagination-bullet${ i === current ? ' swiper-pagination-bullet-active' : '' }` }
					aria-label={ sprintf(
						/* translators: %d: slide number */
						__( 'Show slide %d', 'gutenslider' ),
						i + 1
					) }
					onClick={ () => go( i ) }
					onKeyDown={ ( e ) =>
						( e.key === 'Enter' || e.key === ' ' ) && go( i )
					}
				/>
			) ) }
		</div>
	);
}

function EmptyPlaceholder( { onMedia, onEmpty, onLinks } ) {
	return (
		<MediaPlaceholder
			icon={ icons.gutenslider }
			labels={ {
				title: 'Gutenslider',
				instructions: __(
					'Choose images or videos – each becomes a slide – or start with empty slides and add any blocks to them.',
					'gutenslider'
				),
			} }
			accept="image/*,video/*"
			allowedTypes={ [ 'image', 'video' ] }
			multiple
			onSelect={ onMedia }
		>
			<Button
				__next40pxDefaultSize
				variant="secondary"
				onClick={ onLinks }
			>
				{ __( 'Videos from links', 'gutenslider' ) }
			</Button>
			<Button
				__next40pxDefaultSize
				variant="tertiary"
				onClick={ onEmpty }
			>
				{ __( 'Start with empty slides', 'gutenslider' ) }
			</Button>
		</MediaPlaceholder>
	);
}

export default function SliderEdit( props ) {
	const { attributes, setAttributes, clientId, className, isSelected } =
		props;
	const { contentMode, gsBlockId, animation } = attributes;
	const fixed = contentMode === 'fixed';
	const registry = useRegistry();
	const dispatch = useDispatch( blockEditorStore );

	const { children, selectedSlide, idTaken, childSelected } = useSelect(
		( select ) => {
			const s = select( blockEditorStore );
			const kids = s.getBlocks( clientId );
			const selected = s.getSelectedBlockClientId();
			let slide = null;
			if ( selected ) {
				const chain = [ ...s.getBlockParents( selected ), selected ];
				const at = chain.indexOf( clientId );
				if (
					at !== -1 &&
					chain[ at + 1 ] &&
					s.getBlockName( chain[ at + 1 ] ) === SLIDE
				) {
					slide = chain[ at + 1 ];
				}
			}
			// Another slider with the same id (a copy): this one needs its own.
			const taken =
				!! gsBlockId &&
				s
					.getBlocksByName?.( 'eedee/block-gutenslider' )
					.some(
						( id ) =>
							id !== clientId &&
							s.getBlockAttributes( id )?.gsBlockId === gsBlockId
					);
			return {
				children: kids,
				selectedSlide: slide,
				idTaken: taken,
				childSelected: s.hasSelectedInnerBlock( clientId, true ),
			};
		},
		[ clientId, gsBlockId ]
	);
	const slides = children.filter( ( b ) => b.name === SLIDE );
	const slideIds = slides.map( ( b ) => b.clientId );
	const others = children.length - slides.length;

	// The one attribute written on open: the element id needs gsBlockId.
	useEffect( () => {
		if ( ! gsBlockId || idTaken ) {
			registry
				.dispatch( blockEditorStore )
				.__unstableMarkNextChangeAsNotPersistent?.();
			setAttributes( {
				gsBlockId: Math.random().toString( 36 ).slice( 2, 11 ),
			} );
		}
	}, [ gsBlockId, idTaken ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const [ mode, setMode ] = useState( 'edit' );
	const [ current, setCurrent ] = useState( 0 );
	const count = slides.length;
	const at = Math.min( current, Math.max( 0, count - 1 ) );

	// Selecting a slide (canvas, List View, new slides) shows it.
	useEffect( () => {
		const i = slideIds.indexOf( selectedSlide );
		if ( i !== -1 ) {
			setCurrent( i );
		}
	}, [ selectedSlide ] ); // eslint-disable-line react-hooks/exhaustive-deps

	const go = ( i ) => {
		const next = attributes.loop
			? ( i + count ) % count
			: Math.max( 0, Math.min( count - 1, i ) );
		setCurrent( next );
		// With a slide selected, the new one gets selected (its settings show).
		if ( selectedSlide ) {
			dispatch.selectBlock( slideIds[ next ], null );
		}
	};

	// Place the current slide: at the start (or centered), without leaving
	// empty space after the last slide. Measured, so auto widths work.
	const wrapperRef = useRef();
	const centered =
		attributes.centeredSlides ||
		effectOf( rendered( attributes ).animation ).centered;
	useLayoutEffect( () => {
		const wrapper = wrapperRef.current;
		if ( ! wrapper || fixed || mode !== 'edit' ) {
			return;
		}
		const win = wrapper.ownerDocument.defaultView;
		const place = () => {
			const els = [ ...wrapper.children ].filter( ( el ) =>
				el.classList.contains( 'swiper-slide' )
			);
			const target = els[ at ];
			if ( ! target ) {
				wrapper.style.transform = '';
				return;
			}
			const viewport = wrapper.parentElement.clientWidth;
			const first = els[ 0 ].offsetLeft;
			let x = target.offsetLeft - first;
			if ( centered && perView( attributes, 2 ) !== 1 ) {
				x -= ( viewport - target.offsetWidth ) / 2;
			} else {
				const last = els[ els.length - 1 ];
				x = Math.min(
					x,
					Math.max(
						0,
						last.offsetLeft + last.offsetWidth - first - viewport
					)
				);
			}
			wrapper.style.transform = x ? `translate3d(${ -x }px, 0, 0)` : '';
		};
		place();
		const observer = new win.ResizeObserver( place );
		observer.observe( wrapper.parentElement );
		[ ...wrapper.children ].forEach( ( el ) => observer.observe( el ) );
		return () => observer.disconnect();
	}, [ at, count, centered, animation, fixed, mode, slideIds.join() ] ); // eslint-disable-line react-hooks/exhaustive-deps

	// Adding slides: after the last slide (fixed content stays last).
	const insertSlides = ( blocks ) => {
		const index = children.findLastIndex( ( b ) => b.name === SLIDE ) + 1;
		dispatch.insertBlocks( blocks, index, clientId, true );
	};
	const addMedia = ( items ) =>
		insertSlides(
			( Array.isArray( items ) ? items : [ items ] ).map( ( m ) =>
				newSlide( m, attributes.contentPosition || 'center center' )
			)
		);
	const [ linksOpen, setLinksOpen ] = useState( false );
	const { createSuccessNotice } = useDispatch( noticesStore );
	const addVideos = ( videos ) => {
		// A new slider of videos: each slide in its video's ratio.
		if ( count === 0 ) {
			setAttributes( {
				adaptiveHeight: true,
				adaptiveHeightMd: true,
				adaptiveHeightSm: true,
			} );
		}
		insertSlides(
			videos.map( ( link ) =>
				newSlide(
					{ videoLink: link },
					attributes.contentPosition || 'center center'
				)
			)
		);
		createSuccessNotice( addedMessage( videos.length ), {
			type: 'snackbar',
		} );
	};
	const linksModal = linksOpen && (
		<AddVideosModal
			onAdd={ addVideos }
			onClose={ () => setLinksOpen( false ) }
		/>
	);
	const addEmpty = ( n = 1 ) =>
		insertSlides(
			Array.from( { length: n }, () =>
				newSlide( null, attributes.contentPosition || 'center center' )
			)
		);

	const setPosition = ( contentPosition ) => {
		setAttributes( { contentPosition } );
		// All slides follow, as in 6.x; a slide can still set its own after.
		slideIds.forEach( ( id ) =>
			dispatch.updateBlockAttributes( id, { contentPosition } )
		);
	};

	const onCaptions = ( style ) => {
		setAttributes( { autoCaption: style } );
		applyCaptions( slides, style, dispatch );
	};

	// Preview: the front end's script on a copy.
	const outerRef = useRef();
	const previewRef = useRef();
	useEffect( () => {
		if (
			mode !== 'preview' ||
			! outerRef.current ||
			! previewRef.current
		) {
			return;
		}
		return startPreview(
			previewRef.current,
			outerRef.current,
			attributes,
			className
		);
	}, [ mode ] ); // eslint-disable-line react-hooks/exhaustive-deps
	// A change while previewing goes back to editing.
	const firstRender = useRef( true );
	useEffect( () => {
		if ( firstRender.current ) {
			firstRender.current = false;
			return;
		}
		setMode( 'edit' );
	}, [ attributes, children ] );

	const vars = sliderVars( attributes );
	const blockProps = useBlockProps( {
		// The front end's fixed-content rules move blocks into a layer the
		// editor does not have: its own class instead (see editor.scss).
		className: [
			'gs-editor',
			...sliderClasses( attributes ).map( ( c ) =>
				c === 'content-fixed' ? 'gs-editor-fixed' : c
			),
			mode === 'preview' && 'is-previewing',
		]
			.filter( Boolean )
			.join( ' ' ),
		id:
			attributes.anchor ||
			( gsBlockId ? `gutenslider-${ gsBlockId }` : undefined ),
		style: fixed ? vars : undefined,
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{
			ref: wrapperRef,
			className: 'swiper-wrapper',
			style: fixed ? { '--gs-current': at } : undefined,
		},
		{
			allowedBlocks: fixed ? undefined : [ SLIDE ],
			orientation: 'horizontal',
			renderAppender: false,
			templateLock: false,
		}
	);

	const toolbar = (
		<>
			<BlockControls group="block">
				<BlockAlignmentMatrixControl
					label={ __(
						'Content position of all slides',
						'gutenslider'
					) }
					value={
						POSITIONS[ attributes.contentPosition ]
							? attributes.contentPosition
							: 'center center'
					}
					onChange={ setPosition }
				/>
			</BlockControls>
			{ count > 0 && (
				<BlockControls group="other">
					<ToolbarGroup>
						<ToolbarButton
							isPressed={ mode === 'edit' }
							onClick={ () => setMode( 'edit' ) }
							label={ __( 'Edit the slides', 'gutenslider' ) }
						>
							{ __( 'Edit', 'gutenslider' ) }
						</ToolbarButton>
						<ToolbarButton
							isPressed={ mode === 'preview' }
							onClick={ () => setMode( 'preview' ) }
							label={ __(
								'Preview: the slider as visitors see it, with its effect and autoplay',
								'gutenslider'
							) }
						>
							{ __( 'Preview', 'gutenslider' ) }
						</ToolbarButton>
					</ToolbarGroup>
					<ToolbarGroup>
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image', 'video' ] }
								multiple
								onSelect={ addMedia }
								render={ ( { open } ) => (
									<ToolbarButton
										icon={ imageIcon }
										label={ __(
											'Add slides from the Media Library',
											'gutenslider'
										) }
										onClick={ open }
									/>
								) }
							/>
						</MediaUploadCheck>
						<ToolbarButton
							icon={ videoIcon }
							label={ __(
								'Add videos from links',
								'gutenslider'
							) }
							onClick={ () => setLinksOpen( true ) }
						/>
						<ToolbarButton
							icon={ plus }
							label={ __( 'Add an empty slide', 'gutenslider' ) }
							onClick={ () => addEmpty( 1 ) }
						/>
					</ToolbarGroup>
				</BlockControls>
			) }
		</>
	);

	if ( count === 0 && others === 0 ) {
		return (
			<div { ...blockProps }>
				{ toolbar }
				<EmptyPlaceholder
					onMedia={ addMedia }
					onEmpty={ () => addEmpty( 2 ) }
					onLinks={ () => setLinksOpen( true ) }
				/>
				{ linksModal }
				{ /* Mounted, though empty: without its inner block list the
				editor allows no block to be inserted here. */ }
				<div { ...innerBlocksProps } hidden />
			</div>
		);
	}

	const arrows = arrowSvgs( attributes.arrowStyle );
	const canPrev = attributes.loop || at > 0;
	const canNext = attributes.loop || at < count - 1;

	return (
		<>
			{ toolbar }
			{ linksModal }
			<SliderInspector { ...props } onCaptions={ onCaptions } />
			<div { ...blockProps }>
				<div
					className="eedee-swiper-outer gs-editing"
					ref={ outerRef }
					style={ fixed ? undefined : vars }
					hidden={ mode === 'preview' }
				>
					<Divider attributes={ attributes } side="top" />
					{ /* Focusing a slide out of view (selecting it, closing the
					Media Library) scrolls the clipped box by a slide on top of
					the transform, and the next slide showed. Swiper undoes
					this on the front end; here too. */ }
					<div
						className="swiper"
						onScroll={ ( e ) => {
							e.currentTarget.scrollLeft = 0;
							e.currentTarget.scrollTop = 0;
						} }
					>
						<div { ...innerBlocksProps } />
					</div>
					<button
						type="button"
						className={ `eedee-gutenslider-nav eedee-gutenslider-prev${ canPrev ? '' : ' swiper-button-disabled' }` }
						aria-label={ __( 'Previous slide', 'gutenslider' ) }
						onClick={ () => go( at - 1 ) }
						dangerouslySetInnerHTML={ { __html: arrows.prev } }
					/>
					<button
						type="button"
						className={ `eedee-gutenslider-nav eedee-gutenslider-next${ canNext ? '' : ' swiper-button-disabled' }` }
						aria-label={ __( 'Next slide', 'gutenslider' ) }
						onClick={ () => go( at + 1 ) }
						dangerouslySetInnerHTML={ { __html: arrows.next } }
					/>
					<Pagination
						attributes={ attributes }
						count={ count }
						current={ at }
						go={ go }
					/>
					<Divider attributes={ attributes } side="bottom" />
				</div>
				{ mode === 'preview' && (
					<div className="gutenslider-preview" ref={ previewRef } />
				) }
				{ /* The first click selects the slider, not the slide or block
				under the pointer; once the slider or anything in it is
				selected, clicks reach the slides (as in Wisp Gallery). */ }
				{ ! isSelected && ! childSelected && (
					<div
						className="gutenslider-editor-overlay"
						aria-hidden="true"
						// Also when the slider still has focus (selected
						// before, then deselected), where focus selects nothing.
						onMouseDown={ () => dispatch.selectBlock( clientId ) }
					/>
				) }
				{ mode === 'edit' && (
					<div className="gutenslider-editor-bar">
						<span className="gutenslider-editor-bar__count">
							{ sprintf(
								/* translators: 1: current slide number, 2: number of slides */
								_n(
									'Slide %1$d of %2$d',
									'Slide %1$d of %2$d',
									count,
									'gutenslider'
								),
								at + 1,
								count
							) }
						</span>
						<Button
							size="compact"
							variant="secondary"
							icon={ plus }
							onClick={ () => addEmpty( 1 ) }
						>
							{ __( 'Slide', 'gutenslider' ) }
						</Button>
						{ fixed && (
							<Button
								size="compact"
								variant="tertiary"
								onClick={ () =>
									dispatch.insertBlocks(
										createBlock( 'core/paragraph' ),
										children.length,
										clientId,
										true
									)
								}
							>
								{ __( 'Add content on top', 'gutenslider' ) }
							</Button>
						) }
						{ ! fixed && others > 0 && (
							<span className="gutenslider-note">
								{ __(
									'Some blocks here only show with "Same on all" content.',
									'gutenslider'
								) }
							</span>
						) }
					</div>
				) }
			</div>
		</>
	);
}
