/**
 * The slider's sidebar.
 *
 * Settings: Slides (layout, per device), Motion, Arrows, Pagination,
 * Lightbox, Blending, Dividers; Advanced: loading, captions, visibility,
 * keyboard and links. Styles: arrow, dot and lightbox colors (plus
 * WordPress's spacing).
 *
 * Other plugins add controls through `slot()` (see slots.js).
 */
import { __, _x } from '@wordpress/i18n';
import {
	ColorPalette,
	InspectorAdvancedControls,
	InspectorControls,
	PanelColorSettings,
} from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';

import { desktop, tablet, mobile } from '@wordpress/icons';

import {
	DeviceSwitch,
	StylePicker,
	Svg,
	perDevice,
	useDevice,
} from './controls';
import { effectOf, perView, rendered } from './markup';
import { slotOptions, slot } from './slots';
import { CAPTION_STYLES } from './captions';

const data = () => window.eedeeGutenslider || {};

export const EFFECTS = [
	{ value: 'slide', label: _x( 'Slide', 'slider effect', 'gutenslider' ) },
	{ value: 'fade', label: _x( 'Fade', 'slider effect', 'gutenslider' ) },
	{ value: 'flip', label: _x( 'Flip', 'slider effect', 'gutenslider' ) },
];

const BLEND_MODES = [
	{ value: 'none', label: _x( 'Normal', 'blend mode', 'gutenslider' ) },
	{ value: 'color-burn', label: __( 'Color burn', 'gutenslider' ) },
	{ value: 'color-dodge', label: __( 'Color dodge', 'gutenslider' ) },
	{ value: 'difference', label: __( 'Difference', 'gutenslider' ) },
	{ value: 'exclusion', label: __( 'Exclusion', 'gutenslider' ) },
	{ value: 'saturation', label: __( 'Saturation', 'gutenslider' ) },
];

const ARROW_POSITIONS = [
	{
		value: 'arrow-position-sides',
		label: __( 'Left and right', 'gutenslider' ),
	},
	{
		// Beside the slide's blocks when they are below or above the image;
		// else like left and right.
		value: 'arrow-position-content',
		label: __( 'Next to the blocks', 'gutenslider' ),
	},
	{
		value: 'arrow-position-top-bottom',
		label: __( 'Top and bottom', 'gutenslider' ),
	},
	{
		value: 'arrow-position-bottom-right',
		label: __( 'Bottom right', 'gutenslider' ),
	},
	{
		value: 'arrow-position-bottom-left',
		label: __( 'Bottom left', 'gutenslider' ),
	},
	{
		value: 'arrow-position-top-right',
		label: __( 'Top right', 'gutenslider' ),
	},
	{
		value: 'arrow-position-top-left',
		label: __( 'Top left', 'gutenslider' ),
	},
];

/** Arrow positions with one fixed place per arrow (no spacing between). */
const SIDE_ARROWS = [ 'arrow-position-sides', 'arrow-position-content' ];

const DOT_POSITIONS = [
	{ value: 'dot-position-bottom', label: __( 'Bottom', 'gutenslider' ) },
	{ value: 'dot-position-top', label: __( 'Top', 'gutenslider' ) },
	{ value: 'dot-position-left', label: __( 'Left', 'gutenslider' ) },
	{ value: 'dot-position-right', label: __( 'Right', 'gutenslider' ) },
];

const TEXT_SOURCES = [
	{ value: 'none', label: __( 'Nothing', 'gutenslider' ) },
	{ value: 'title', label: __( 'Image title', 'gutenslider' ) },
	{ value: 'caption', label: __( 'Image caption', 'gutenslider' ) },
	{ value: 'description', label: __( 'Image description', 'gutenslider' ) },
	{ value: 'alt', label: __( 'Alternative text', 'gutenslider' ) },
];

const VIEWPORTS = [
	{ key: '', label: __( 'Desktop', 'gutenslider' ), icon: desktop },
	{ key: 'Md', label: __( 'Tablet', 'gutenslider' ), icon: tablet },
	{ key: 'Sm', label: __( 'Mobile', 'gutenslider' ), icon: mobile },
];

/**
 * "Show on: Desktop Tablet Mobile" for attributes named like arrows,
 * arrowsMd, arrowsSm.
 *
 * @param {Object}   props
 * @param {string}   props.name          Attribute base name.
 * @param {string}   props.label         Label.
 * @param {Object}   props.attributes    Attributes.
 * @param {Function} props.setAttributes Setter.
 */
function ShowOn( { name, label, attributes, setAttributes } ) {
	return (
		<BaseControl
			__nextHasNoMarginBottom
			label={ label }
			id={ undefined }
			className="gutenslider-show-on"
		>
			<div className="gutenslider-show-on__buttons">
				{ VIEWPORTS.map( ( { key, label: device, icon } ) => (
					<Button
						key={ key }
						__next40pxDefaultSize
						icon={ icon }
						label={ device }
						showTooltip
						isPressed={ !! attributes[ name + key ] }
						aria-pressed={ !! attributes[ name + key ] }
						onClick={ () =>
							setAttributes( {
								[ name + key ]: ! attributes[ name + key ],
							} )
						}
					/>
				) ) }
			</div>
		</BaseControl>
	);
}

/**
 * Help for "Blocks: on top, below, above".
 *
 * @param {Object} attributes Slider attributes.
 * @return {string|undefined} Help.
 */
function placementHelp( attributes ) {
	if ( ! [ 'below', 'above' ].includes( attributes.contentPlacement ) ) {
		return undefined;
	}
	if ( ! effectOf( rendered( attributes ).animation ).placement ) {
		return __(
			'Not with this effect: the blocks stay on top.',
			'gutenslider'
		);
	}
	return __(
		'The image keeps the minimum height; the blocks take the room they need.',
		'gutenslider'
	);
}

function SlidesPanel( props ) {
	const { attributes, setAttributes } = props;
	const [ device, setDevice ] = useDevice();
	const key = ( name ) => name + device.suffix;
	const single = perView( attributes, 2 ) === 1;
	const view = perView( attributes, attributes[ key( 'slidesToShow' ) ] );
	const auto = view === 'auto';

	return (
		<PanelBody title={ __( 'Slides', 'gutenslider' ) }>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Content', 'gutenslider' ) }
				help={
					attributes.contentMode === 'fixed'
						? __(
								'The same blocks stay on top while the backgrounds change. Add them below the slides.',
								'gutenslider'
							)
						: __( 'Each slide has its own blocks.', 'gutenslider' )
				}
				value={
					attributes.contentMode === 'fixed' ? 'fixed' : 'change'
				}
				onChange={ ( value ) =>
					setAttributes( { contentMode: value } )
				}
			>
				<ToggleGroupControlOption
					value="change"
					label={ __( 'Per slide', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="fixed"
					label={ __( 'Same on all', 'gutenslider' ) }
				/>
			</ToggleGroupControl>
			{ attributes.contentMode !== 'fixed' && (
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={ __( 'Blocks', 'gutenslider' ) }
					help={ placementHelp( attributes ) }
					value={ attributes.contentPlacement || 'over' }
					onChange={ ( value ) =>
						setAttributes( { contentPlacement: value } )
					}
				>
					<ToggleGroupControlOption
						value="over"
						label={ _x(
							'On top',
							'content placement',
							'gutenslider'
						) }
					/>
					<ToggleGroupControlOption
						value="below"
						label={ _x(
							'Below',
							'content placement',
							'gutenslider'
						) }
					/>
					<ToggleGroupControlOption
						value="above"
						label={ _x(
							'Above',
							'content placement',
							'gutenslider'
						) }
					/>
				</ToggleGroupControl>
			) }

			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Content width', 'gutenslider' ) }
				help={
					attributes.contentWidth === 'wide' ||
					attributes.contentWidth === 'content'
						? __(
								"The blocks line up with the theme's width; the background stays full width.",
								'gutenslider'
							)
						: undefined
				}
				value={ attributes.contentWidth || 'full' }
				onChange={ ( value ) =>
					setAttributes( { contentWidth: value } )
				}
			>
				<ToggleGroupControlOption
					value="full"
					label={ _x( 'Full', 'content width', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="wide"
					label={ _x( 'Wide', 'content width', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="content"
					label={ _x( 'Content', 'content width', 'gutenslider' ) }
				/>
			</ToggleGroupControl>

			<DeviceSwitch device={ device } onChange={ setDevice } />

			{ single ? (
				<p className="gutenslider-note">
					{ __(
						'This effect shows one slide at a time.',
						'gutenslider'
					) }
				</p>
			) : (
				<>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ perDevice(
							__( 'Width from content', 'gutenslider' ),
							device
						) }
						help={ __(
							'Each slide is as wide as its image. Slides without media use their own width setting.',
							'gutenslider'
						) }
						checked={ auto }
						onChange={ ( value ) =>
							setAttributes( {
								[ key( 'slidesToShow' ) ]: value ? 0 : 1,
							} )
						}
					/>
					{ ! auto && (
						<RangeControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ perDevice(
								__( 'Slides in view', 'gutenslider' ),
								device
							) }
							value={
								Number( attributes[ key( 'slidesToShow' ) ] ) ||
								1
							}
							min={ 1 }
							max={ 8 }
							step={ 0.5 }
							onChange={ ( value ) =>
								setAttributes( {
									[ key( 'slidesToShow' ) ]: value ?? 1,
								} )
							}
						/>
					) }
					{ ( auto || view > 1 ) && (
						<>
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ perDevice(
									__( 'Slides per step', 'gutenslider' ),
									device
								) }
								value={
									Number(
										attributes[ key( 'slidesToScroll' ) ]
									) || 1
								}
								min={ 1 }
								max={ 8 }
								onChange={ ( value ) =>
									setAttributes( {
										[ key( 'slidesToScroll' ) ]: value ?? 1,
									} )
								}
							/>
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ perDevice(
									__(
										'Space between slides, px',
										'gutenslider'
									),
									device
								) }
								value={
									Number(
										attributes[ key( 'spaceBetween' ) ]
									) || 0
								}
								min={ 0 }
								max={ 120 }
								onChange={ ( value ) =>
									setAttributes( {
										[ key( 'spaceBetween' ) ]: value ?? 0,
									} )
								}
							/>
						</>
					) }
				</>
			) }

			<UnitControl
				__next40pxDefaultSize
				label={ perDevice(
					__( 'Minimum height', 'gutenslider' ),
					device
				) }
				value={ attributes[ key( 'sliderHeight' ) ] }
				units={ [
					{ value: 'px', label: 'px', default: 400 },
					{ value: 'vh', label: 'vh', default: 50 },
					{ value: 'em', label: 'em', default: 20 },
					{ value: '%', label: '%', default: 50 },
				] }
				onChange={ ( value ) =>
					setAttributes( {
						[ key( 'sliderHeight' ) ]: value || '50vh',
					} )
				}
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ perDevice(
					__( 'Grow with the content', 'gutenslider' ),
					device
				) }
				help={ __(
					'The slider takes the height of the slide on show.',
					'gutenslider'
				) }
				checked={ !! attributes[ key( 'adaptiveHeight' ) ] }
				onChange={ ( value ) =>
					setAttributes( { [ key( 'adaptiveHeight' ) ]: value } )
				}
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Full screen height', 'gutenslider' ) }
				checked={ !! attributes.isFullScreen }
				onChange={ ( value ) =>
					setAttributes( { isFullScreen: value } )
				}
			/>
			{ slot( 'slider.slides', { ...props, device } ) }
		</PanelBody>
	);
}

/**
 * The effect, grouped when added options have groups (option `group`).
 *
 * @param {Object}   props
 * @param {string}   props.value    Effect.
 * @param {Function} props.onChange Setter.
 */
function EffectSelect( { value, onChange } ) {
	const options = slotOptions( 'effects', EFFECTS, value );
	const groups = [ ...new Set( options.map( ( o ) => o.group || '' ) ) ];
	return (
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ __( 'Effect', 'gutenslider' ) }
			help={ options.find( ( o ) => o.value === value )?.help }
			value={ value }
			onChange={ onChange }
		>
			{ groups.map( ( group ) => {
				const items = options
					.filter( ( o ) => ( o.group || '' ) === group )
					.map( ( o ) => (
						<option key={ o.value } value={ o.value }>
							{ o.label }
						</option>
					) );
				return group ? (
					<optgroup key={ group } label={ group }>
						{ items }
					</optgroup>
				) : (
					items
				);
			} ) }
		</SelectControl>
	);
}

function MotionPanel( props ) {
	const { attributes, setAttributes } = props;
	const single = perView( attributes, 2 ) === 1;
	return (
		<PanelBody
			title={ __( 'Motion', 'gutenslider' ) }
			initialOpen={ false }
		>
			<EffectSelect
				value={ attributes.animation }
				onChange={ ( value ) => setAttributes( { animation: value } ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Loop', 'gutenslider' ) }
				help={ __(
					'After the last slide comes the first.',
					'gutenslider'
				) }
				checked={ !! attributes.loop }
				onChange={ ( value ) => setAttributes( { loop: value } ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Random order', 'gutenslider' ) }
				help={ __(
					'A new order on each visit, also on cached pages. The editor keeps the saved order.',
					'gutenslider'
				) }
				checked={ !! attributes.randomOrder }
				onChange={ ( value ) =>
					setAttributes( { randomOrder: value } )
				}
			/>
			{ ! single && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Center the active slide', 'gutenslider' ) }
					checked={ !! attributes.centeredSlides }
					onChange={ ( value ) =>
						setAttributes( { centeredSlides: value } )
					}
				/>
			) }
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Autoplay', 'gutenslider' ) }
				help={ __(
					'Stops for visitors who prefer reduced motion, unless set otherwise under Advanced.',
					'gutenslider'
				) }
				checked={ !! attributes.autoplay }
				onChange={ ( value ) => setAttributes( { autoplay: value } ) }
			/>
			{ attributes.autoplay && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __(
						'Pause while the pointer is over the slider',
						'gutenslider'
					) }
					checked={ !! attributes.pauseOnHover }
					onChange={ ( value ) =>
						setAttributes( { pauseOnHover: value } )
					}
				/>
			) }
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __(
					'Play videos when their slide shows',
					'gutenslider'
				) }
				help={ __(
					'For all video slides; a slide can set its own.',
					'gutenslider'
				) }
				checked={ attributes.videoAutoplay !== false }
				onChange={ ( value ) =>
					setAttributes( { videoAutoplay: value } )
				}
			/>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Transition time (s)', 'gutenslider' ) }
				value={ Number( attributes.fadeSpeed ) || 0.7 }
				min={ 0.1 }
				max={ 3 }
				step={ 0.1 }
				onChange={ ( value ) =>
					setAttributes( { fadeSpeed: value ?? 0.7 } )
				}
			/>
			{ attributes.autoplay && (
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Time per slide (s)', 'gutenslider' ) }
					value={ Number( attributes.duration ) || 3 }
					min={ 1 }
					max={ 20 }
					step={ 0.5 }
					onChange={ ( value ) =>
						setAttributes( { duration: value ?? 3 } )
					}
				/>
			) }
			{ slot( 'slider.motion', props ) }
		</PanelBody>
	);
}

export const arrowOptions = () =>
	( data().arrows || [] ).map( ( arrow ) => ( {
		value: arrow.value,
		label: arrow.label || arrow.value,
		preview: (
			<Svg className="gutenslider-arrow-preview" svg={ arrow.next } />
		),
	} ) );

function ArrowsPanel( props ) {
	const { attributes, setAttributes } = props;
	const [ device ] = useDevice();
	const key = ( name ) => name + device.suffix;
	const shown =
		attributes.arrows || attributes.arrowsMd || attributes.arrowsSm;
	return (
		<PanelBody
			title={ __( 'Arrows', 'gutenslider' ) }
			initialOpen={ false }
		>
			<ShowOn
				{ ...props }
				name="arrows"
				label={ __( 'Show on', 'gutenslider' ) }
			/>
			{ shown && (
				<>
					<StylePicker
						label={ __( 'Style', 'gutenslider' ) }
						options={ arrowOptions() }
						value={ attributes.arrowStyle }
						onChange={ ( value ) =>
							setAttributes( { arrowStyle: value } )
						}
					/>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ perDevice(
							__( 'Size in px', 'gutenslider' ),
							device
						) }
						value={
							Number( attributes[ key( 'arrowSize' ) ] ) || 30
						}
						min={ 12 }
						max={ 120 }
						onChange={ ( value ) =>
							setAttributes( {
								[ key( 'arrowSize' ) ]: value ?? 30,
							} )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Position', 'gutenslider' ) }
						value={ attributes.arrowPosition }
						options={ slotOptions(
							'arrowPositions',
							ARROW_POSITIONS,
							attributes.arrowPosition
						) }
						onChange={ ( value ) => {
							const changes = { arrowPosition: value };
							// Beside blocks below/above the image the arrows sit
							// on the page, not on the photo: the default white
							// would vanish, the text color shows. A picked
							// color stays.
							if (
								value === 'arrow-position-content' &&
								[ 'below', 'above' ].includes(
									attributes.contentPlacement
								) &&
								[ '#fff', '#ffffff', '' ].includes(
									String(
										attributes.arrowColor ?? ''
									).toLowerCase()
								)
							) {
								changes.arrowColor = 'currentColor';
							}
							setAttributes( changes );
						} }
					/>
					{ [
						[
							'arrowXOffset',
							__( 'Move sideways, px', 'gutenslider' ),
						],
						[
							'arrowYOffset',
							__( 'Move up or down, px', 'gutenslider' ),
						],
					].map( ( [ name, label ] ) => (
						<RangeControl
							key={ name }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ perDevice( label, device ) }
							value={ Number( attributes[ key( name ) ] ) || 0 }
							min={ -200 }
							max={ 200 }
							onChange={ ( value ) =>
								setAttributes( { [ key( name ) ]: value ?? 0 } )
							}
						/>
					) ) }
					{ ARROW_POSITIONS.some(
						( p ) => p.value === attributes.arrowPosition
					) &&
						! SIDE_ARROWS.includes( attributes.arrowPosition ) && (
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __(
									'Space between the arrows, px',
									'gutenslider'
								) }
								value={
									Number( attributes.arrowXSpacing ) || 0
								}
								min={ 0 }
								max={ 200 }
								onChange={ ( value ) =>
									setAttributes( {
										arrowXSpacing: value ?? 0,
									} )
								}
							/>
						) }
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Blend with the slide', 'gutenslider' ) }
						value={ attributes.arrowMixBlendMode || 'none' }
						options={ BLEND_MODES }
						onChange={ ( value ) =>
							setAttributes( { arrowMixBlendMode: value } )
						}
					/>
					{ slot( 'slider.arrows', { ...props, device } ) }
				</>
			) }
		</PanelBody>
	);
}

function PaginationPanel( props ) {
	const { attributes, setAttributes } = props;
	const [ device ] = useDevice();
	const key = ( name ) => name + device.suffix;
	const shown = attributes.dots || attributes.dotsMd || attributes.dotsSm;
	return (
		<PanelBody
			title={ __( 'Pagination', 'gutenslider' ) }
			initialOpen={ false }
		>
			<ShowOn
				{ ...props }
				name="dots"
				label={ __( 'Show on', 'gutenslider' ) }
			/>
			{ shown && (
				<>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ perDevice(
							__( 'Size in px', 'gutenslider' ),
							device
						) }
						value={ Number( attributes[ key( 'dotSize' ) ] ) || 25 }
						min={ 6 }
						max={ 60 }
						onChange={ ( value ) =>
							setAttributes( {
								[ key( 'dotSize' ) ]: value ?? 25,
							} )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Position', 'gutenslider' ) }
						value={ attributes.dotPosition }
						options={ slotOptions(
							'dotPositions',
							DOT_POSITIONS,
							attributes.dotPosition
						) }
						onChange={ ( value ) =>
							setAttributes( { dotPosition: value } )
						}
					/>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ perDevice(
							__( 'Move up or down, px', 'gutenslider' ),
							device
						) }
						value={
							Number( attributes[ key( 'dotYOffset' ) ] ) || 0
						}
						min={ -200 }
						max={ 200 }
						onChange={ ( value ) =>
							setAttributes( {
								[ key( 'dotYOffset' ) ]: value ?? 0,
							} )
						}
					/>
					{ slot( 'slider.pagination', { ...props, device } ) }
				</>
			) }
		</PanelBody>
	);
}

export const dividerOptions = () =>
	Object.values( data().gutensliderDividers || {} ).map( ( d ) => ( {
		value: d.value,
		label: d.value === 'none' ? d.label : d.value,
		preview:
			d.value === 'none' ? (
				<span className="gutenslider-divider-none">
					{ _x( 'None', 'divider', 'gutenslider' ) }
				</span>
			) : (
				<Svg className="gutenslider-divider-preview" svg={ d.svg } />
			),
	} ) );

function DividersPanel( props ) {
	const { attributes, setAttributes } = props;
	const dividers = attributes.dividers || {};
	const set = ( side, changes ) =>
		setAttributes( {
			dividers: {
				...dividers,
				[ side ]: { ...( dividers[ side ] || {} ), ...changes },
			},
		} );
	const unsupported = ! effectOf( rendered( attributes ).animation ).dividers;
	return (
		<PanelBody
			title={ __( 'Dividers', 'gutenslider' ) }
			initialOpen={ false }
		>
			{ unsupported && (
				<p className="gutenslider-note">
					{ __(
						'Dividers do not show with this effect.',
						'gutenslider'
					) }
				</p>
			) }
			{ [
				[ 'top', __( 'Top', 'gutenslider' ) ],
				[ 'bottom', __( 'Bottom', 'gutenslider' ) ],
			].map( ( [ side, label ] ) => {
				const d = dividers[ side ] || {};
				const on = d.value && d.value !== 'none';
				return (
					<div key={ side } className="gutenslider-divider-settings">
						<StylePicker
							label={ label }
							columns={ 3 }
							options={ dividerOptions() }
							value={ d.value || 'none' }
							onChange={ ( value ) => set( side, { value } ) }
						/>
						{ on && (
							<>
								<BaseControl
									__nextHasNoMarginBottom
									label={ __( 'Color', 'gutenslider' ) }
									id={ undefined }
								>
									{ /* With alpha, WordPress 7.1's custom color picker drags
									smoothly; without it, it bounces between two colors. */ }
									<ColorPalette
										value={ d.color }
										enableAlpha
										onChange={ ( color ) =>
											set( side, { color: color ?? '' } )
										}
									/>
								</BaseControl>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __(
										'Flip horizontally',
										'gutenslider'
									) }
									checked={ !! d.flipY }
									onChange={ ( value ) =>
										set( side, { flipY: value } )
									}
								/>
								<RangeControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={ __(
										'Height in px',
										'gutenslider'
									) }
									value={ Number( d.height ) || 60 }
									min={ 10 }
									max={ 400 }
									onChange={ ( value ) =>
										set( side, { height: value ?? 60 } )
									}
								/>
								<ToggleControl
									__nextHasNoMarginBottom
									label={ __(
										'Invert the shape',
										'gutenslider'
									) }
									checked={ !! d.inverted }
									onChange={ ( value ) =>
										set( side, { inverted: value } )
									}
								/>
								{ slot( 'slider.divider', {
									...props,
									side,
									divider: d,
									setDivider: ( changes ) =>
										set( side, changes ),
								} ) }
							</>
						) }
					</div>
				);
			} ) }
		</PanelBody>
	);
}

// Lightbox looks; any other colors come from the Styles tab.
const LIGHTBOX_THEMES = {
	light: { lgBgColor: '#ffffff', lgFontColor: '#000000' },
	dark: { lgBgColor: '#111111', lgFontColor: '#ffffff' },
};

/**
 * Lightbox: on or off, the look, the opening, texts, counter and
 * thumbnails (more through the slot `slider.lightbox`).
 *
 * @param {Object} props Block props.
 */
function LightboxPanel( props ) {
	const { attributes, setAttributes } = props;
	const theme = Object.keys( LIGHTBOX_THEMES ).find(
		( key ) =>
			LIGHTBOX_THEMES[ key ].lgBgColor ===
				( attributes.lgBgColor || '' ).toLowerCase() &&
			LIGHTBOX_THEMES[ key ].lgFontColor ===
				( attributes.lgFontColor || '' ).toLowerCase()
	);
	return (
		<PanelBody
			title={ __( 'Lightbox', 'gutenslider' ) }
			initialOpen={ false }
		>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __(
					'Open images and videos in a lightbox',
					'gutenslider'
				) }
				help={ __(
					'On click: the slide backgrounds, and Image and Video blocks on the slides. Not for slides with a link.',
					'gutenslider'
				) }
				checked={ !! attributes.hasLg }
				onChange={ ( value ) =>
					setAttributes( {
						hasLg: value,
					} )
				}
			/>
			{ attributes.hasLg && (
				<>
					<ToggleGroupControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						isBlock
						label={ __( 'Look', 'gutenslider' ) }
						help={
							theme
								? undefined
								: __(
										'Uses the lightbox colors from the Styles tab.',
										'gutenslider'
									)
						}
						value={ theme }
						onChange={ ( value ) =>
							setAttributes( LIGHTBOX_THEMES[ value ] )
						}
					>
						<ToggleGroupControlOption
							value="light"
							label={ _x(
								'Light',
								'lightbox look',
								'gutenslider'
							) }
						/>
						<ToggleGroupControlOption
							value="dark"
							label={ _x(
								'Dark',
								'lightbox look',
								'gutenslider'
							) }
						/>
					</ToggleGroupControl>
					<ToggleGroupControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						isBlock
						label={ __( 'Opening', 'gutenslider' ) }
						value={ attributes.lgOpen || 'zoom' }
						onChange={ ( value ) =>
							setAttributes( { lgOpen: value } )
						}
					>
						<ToggleGroupControlOption
							value="zoom"
							label={ _x(
								'Grow',
								'lightbox opening',
								'gutenslider'
							) }
						/>
						<ToggleGroupControlOption
							value="fade"
							label={ __( 'Fade', 'gutenslider' ) }
						/>
					</ToggleGroupControl>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Heading', 'gutenslider' ) }
						value={ attributes.lgTitle }
						options={ TEXT_SOURCES }
						onChange={ ( value ) =>
							setAttributes( { lgTitle: value } )
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Text', 'gutenslider' ) }
						value={ attributes.lgCaption }
						options={ TEXT_SOURCES }
						onChange={ ( value ) =>
							setAttributes( { lgCaption: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Counter (3 / 12)', 'gutenslider' ) }
						checked={ !! attributes.hasLgCounter }
						onChange={ ( value ) =>
							setAttributes( { hasLgCounter: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Thumbnails', 'gutenslider' ) }
						checked={ !! attributes.lgThumbnails }
						onChange={ ( value ) =>
							setAttributes( { lgThumbnails: value } )
						}
					/>
					{ slot( 'slider.lightbox', props ) }
				</>
			) }
		</PanelBody>
	);
}

function BlendPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Blending', 'gutenslider' ) }
			initialOpen={ false }
		>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Content blend mode', 'gutenslider' ) }
				help={ __(
					'How the blocks on the slides mix with the backgrounds.',
					'gutenslider'
				) }
				value={ attributes.mixBlendMode || 'none' }
				options={ BLEND_MODES }
				onChange={ ( value ) =>
					setAttributes( { mixBlendMode: value } )
				}
			/>
			{ attributes.contentMode === 'fixed' && (
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Content opacity', 'gutenslider' ) }
					value={ Number( attributes.contentOpacity ?? 1 ) }
					min={ 0 }
					max={ 1 }
					step={ 0.1 }
					onChange={ ( value ) =>
						setAttributes( { contentOpacity: value ?? 1 } )
					}
				/>
			) }
		</PanelBody>
	);
}

function Advanced( { attributes, setAttributes, onCaptions } ) {
	return (
		<InspectorAdvancedControls>
			<BaseControl
				__nextHasNoMarginBottom
				label={ __( 'Slider ID (for custom CSS)', 'gutenslider' ) }
				id={ undefined }
			>
				<code className="gutenslider-code">
					{ attributes.anchor ||
						`gutenslider-${ attributes.gsBlockId || '' }` }
				</code>
			</BaseControl>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Load the first image right away', 'gutenslider' ) }
				help={ __(
					'For a slider at the top of the page. The first slider on a page does this anyway.',
					'gutenslider'
				) }
				checked={ !! attributes.firstNotLazy }
				onChange={ ( value ) =>
					setAttributes( { firstNotLazy: value } )
				}
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Captions from the Media Library', 'gutenslider' ) }
				help={ __(
					'Adds a paragraph with the image texts to each image slide. You can edit it afterwards.',
					'gutenslider'
				) }
				value={ attributes.autoCaption || 'none' }
				options={ CAPTION_STYLES }
				onChange={ onCaptions }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Link images to the file', 'gutenslider' ) }
				help={
					attributes.hasLg
						? __(
								'The slider’s lightbox is on and opens the images.',
								'gutenslider'
							)
						: __(
								'For lightbox plugins that open linked images. Slides with their own link keep it.',
								'gutenslider'
							)
				}
				// The slider's lightbox wins: no file links while it is on.
				disabled={ !! attributes.hasLg }
				checked={ !! attributes.linkToFile && ! attributes.hasLg }
				onChange={ ( value ) => setAttributes( { linkToFile: value } ) }
			/>
			<ShowOn
				name="visibleOn"
				label={ __( 'Show the slider on', 'gutenslider' ) }
				attributes={ {
					visibleOn: attributes.visibleOnDesktop,
					visibleOnMd: attributes.visibleOnTablet,
					visibleOnSm: attributes.visibleOnMobile,
				} }
				setAttributes={ ( changes ) => {
					const map = {
						visibleOn: 'visibleOnDesktop',
						visibleOnMd: 'visibleOnTablet',
						visibleOnSm: 'visibleOnMobile',
					};
					setAttributes(
						Object.fromEntries(
							Object.entries( changes ).map( ( [ k, v ] ) => [
								map[ k ],
								v,
							] )
						)
					);
				} }
			/>
			{ attributes.autoplay && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __(
						'Autoplay for visitors who prefer reduced motion',
						'gutenslider'
					) }
					help={ __(
						'For example with animation effects off in Windows. The slides fade instead of moving.',
						'gutenslider'
					) }
					checked={ !! attributes.autoplayReducedMotion }
					onChange={ ( value ) =>
						setAttributes( { autoplayReducedMotion: value } )
					}
				/>
			) }
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Arrow keys change slides', 'gutenslider' ) }
				help={ __( 'While the slider is on screen.', 'gutenslider' ) }
				checked={ !! attributes.keyboardNavigation }
				onChange={ ( value ) =>
					setAttributes( { keyboardNavigation: value } )
				}
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Link to each slide', 'gutenslider' ) }
				help={ __(
					'The page address follows the slide on show (#name), so a shared link opens that slide.',
					'gutenslider'
				) }
				checked={ !! attributes.hashNavigation }
				onChange={ ( value ) =>
					setAttributes( { hashNavigation: value } )
				}
			/>
			{ attributes.hashNavigation && (
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Link prefix', 'gutenslider' ) }
					help={ __(
						'Slides without a link name of their own get #prefix-1, #prefix-2…',
						'gutenslider'
					) }
					value={ attributes.hashId || '' }
					onChange={ ( value ) =>
						setAttributes( {
							hashId: value.replace( /[^A-Za-z0-9_-]/g, '-' ),
						} )
					}
				/>
			) }
		</InspectorAdvancedControls>
	);
}

export default function SliderInspector( props ) {
	const { attributes, setAttributes } = props;
	return (
		<>
			<InspectorControls>
				<SlidesPanel { ...props } />
				<MotionPanel { ...props } />
				<ArrowsPanel { ...props } />
				<PaginationPanel { ...props } />
				<LightboxPanel { ...props } />
				<BlendPanel { ...props } />
				{ slot( 'slider.panels', props ) }
				<DividersPanel { ...props } />
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelColorSettings
					title={ __( 'Arrow colors', 'gutenslider' ) }
					initialOpen={ false }
					enableAlpha
					colorSettings={ [
						[ 'arrowColor', __( 'Arrow', 'gutenslider' ) ],
						[ 'arrowBgColor', __( 'Background', 'gutenslider' ) ],
						[
							'arrowHoverColor',
							__( 'Arrow on hover', 'gutenslider' ),
						],
						[
							'arrowBgHoverColor',
							__( 'Background on hover', 'gutenslider' ),
						],
					].map( ( [ name, label ] ) => ( {
						label,
						value: attributes[ name ] || undefined,
						onChange: ( value ) =>
							setAttributes( { [ name ]: value ?? '' } ),
					} ) ) }
				/>
				<PanelColorSettings
					title={ __( 'Pagination color', 'gutenslider' ) }
					initialOpen={ false }
					enableAlpha
					colorSettings={ [
						{
							label: __( 'Dots', 'gutenslider' ),
							value: attributes.dotColor || undefined,
							onChange: ( value ) =>
								setAttributes( { dotColor: value ?? '' } ),
						},
					] }
				/>
				{ attributes.hasLg && (
					<PanelColorSettings
						title={ __( 'Lightbox colors', 'gutenslider' ) }
						initialOpen={ false }
						enableAlpha
						colorSettings={ [
							{
								label: __( 'Background', 'gutenslider' ),
								value: attributes.lgBgColor || undefined,
								onChange: ( value ) =>
									setAttributes( {
										lgBgColor: value ?? '#ffffff',
									} ),
							},
							{
								label: __( 'Text and buttons', 'gutenslider' ),
								value: attributes.lgFontColor || undefined,
								onChange: ( value ) =>
									setAttributes( {
										lgFontColor: value ?? '#000000',
									} ),
							},
						] }
					/>
				) }
				{ slot( 'slider.styles', props ) }
			</InspectorControls>
			<Advanced { ...props } />
		</>
	);
}
