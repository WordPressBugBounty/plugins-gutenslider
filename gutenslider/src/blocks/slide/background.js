/**
 * The slide's background: image, video, color, gradient or none, and for
 * media an optional color or gradient overlay.
 *
 * Saved in the 6.x shape (`background` object). 6.x also saved "color with
 * the image under it" as type color plus `backgroundOverlayImage: 'color'`;
 * such slides show here as an image with a color overlay, and are saved as
 * type image on the next change (the front end draws both the same).
 */
import { __, _x } from '@wordpress/i18n';
import {
	ColorPalette,
	MediaUpload,
	MediaUploadCheck,
	useSettings,
} from '@wordpress/block-editor';
import {
	Button,
	FocalPointPicker,
	GradientPicker,
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
	BaseControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

import { embedOf } from '../slider/markup';
import { VideoAutoplayControl, VideoLinkFields } from './video-links';

/**
 * The fields of a Media Library item the slide keeps (6.x kept the whole
 * object, nonces included).
 *
 * @param {Object} media Media from the library or an upload.
 * @return {Object} Saved media.
 */
export const pickMedia = ( media ) => ( {
	id: media.id,
	url: media.url,
	alt: media.alt || '',
	width: media.width || media.media_details?.width,
	height: media.height || media.media_details?.height,
	mime: media.mime || media.mime_type,
	type: media.type || media.media_type,
} );

/**
 * What the slide shows, as the sidebar presents it.
 *
 * @param {Object} bg Saved background.
 * @return {Object} { kind, overlay }.
 */
export function readBackground( bg = {} ) {
	const type = bg.backgroundType || 'color';
	const overlayImage = bg.backgroundOverlayImage || '';
	const overlayVideo = bg.backgroundOverlayVideo || '';
	if (
		type === 'image' ||
		( [ 'color', 'gradient' ].includes( type ) && overlayImage === type )
	) {
		return { kind: 'image', overlay: overlayImage };
	}
	if (
		type === 'video' ||
		( [ 'color', 'gradient' ].includes( type ) && overlayVideo === type )
	) {
		return { kind: 'video', overlay: overlayVideo };
	}
	return {
		kind: [ 'color', 'gradient', 'none' ].includes( type ) ? type : 'color',
		overlay: '',
	};
}

const FITS = [
	{
		value: 'cover',
		label: _x( 'Fill the slide (crop)', 'background size', 'gutenslider' ),
	},
	{
		value: 'contain',
		label: _x( 'Show all of it', 'background size', 'gutenslider' ),
	},
	{ value: 'fill', label: _x( 'Stretch', 'background size', 'gutenslider' ) },
	{
		value: 'none',
		label: _x( 'Original size', 'background size', 'gutenslider' ),
	},
];

function MediaButton( {
	media,
	allowedTypes,
	label,
	onSelect,
	onRemove,
	preview = true,
} ) {
	return (
		<MediaUploadCheck>
			<MediaUpload
				allowedTypes={ allowedTypes }
				value={ media?.id }
				onSelect={ ( item ) => onSelect( pickMedia( item ) ) }
				render={ ( { open } ) => (
					<div className="gutenslider-media-button">
						{ media?.url ? (
							<>
								{ preview && (
									<Button
										className="gutenslider-media-button__preview"
										onClick={ open }
										label={ __( 'Replace', 'gutenslider' ) }
									>
										{ allowedTypes.includes( 'video' ) ? (
											<video
												src={ media.url }
												muted
												playsInline
											/>
										) : (
											<img src={ media.url } alt="" />
										) }
									</Button>
								) }
								<div className="gutenslider-media-button__actions">
									<Button
										__next40pxDefaultSize
										variant="secondary"
										onClick={ open }
									>
										{ __( 'Replace', 'gutenslider' ) }
									</Button>
									<Button
										__next40pxDefaultSize
										variant="tertiary"
										isDestructive
										onClick={ onRemove }
									>
										{ __( 'Remove', 'gutenslider' ) }
									</Button>
								</div>
							</>
						) : (
							<Button
								__next40pxDefaultSize
								variant="secondary"
								className="gutenslider-media-button__add"
								onClick={ open }
							>
								{ label }
							</Button>
						) }
					</div>
				) }
			/>
		</MediaUploadCheck>
	);
}

function Overlay( { bg, overlay, overlayKey, update } ) {
	return (
		<>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Overlay', 'gutenslider' ) }
				value={ overlay || 'none' }
				onChange={ ( value ) =>
					update( { [ overlayKey ]: value === 'none' ? '' : value } )
				}
			>
				<ToggleGroupControlOption
					value="none"
					label={ _x( 'None', 'overlay', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="color"
					label={ __( 'Color', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="gradient"
					label={ __( 'Gradient', 'gutenslider' ) }
				/>
			</ToggleGroupControl>
			{ overlay === 'color' && (
				<ColorField bg={ bg } update={ update } />
			) }
			{ overlay === 'gradient' && (
				<GradientField bg={ bg } update={ update } />
			) }
			{ overlay && (
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Overlay opacity', 'gutenslider' ) }
					value={ bg.backgroundOverlayOpacity ?? 50 }
					min={ 0 }
					max={ 100 }
					step={ 5 }
					onChange={ ( value ) =>
						update( { backgroundOverlayOpacity: value ?? 50 } )
					}
				/>
			) }
		</>
	);
}

function ColorField( { bg, update } ) {
	return (
		<BaseControl
			__nextHasNoMarginBottom
			label={ __( 'Color', 'gutenslider' ) }
			id={ undefined }
		>
			<ColorPalette
				value={ bg.backgroundColor }
				enableAlpha
				onChange={ ( value ) =>
					update( { backgroundColor: value ?? '' } )
				}
			/>
		</BaseControl>
	);
}

function GradientField( { bg, update } ) {
	const [ gradients ] = useSettings( 'color.gradients' );
	return (
		<BaseControl
			__nextHasNoMarginBottom
			label={ __( 'Gradient', 'gutenslider' ) }
			id={ undefined }
		>
			<GradientPicker
				value={
					typeof bg.backgroundGradient === 'string'
						? bg.backgroundGradient
						: undefined
				}
				gradients={ gradients || [] }
				onChange={ ( value ) =>
					update( { backgroundGradient: value ?? '' } )
				}
			/>
		</BaseControl>
	);
}

/**
 * Background panel of the slide sidebar.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes     Slide attributes.
 * @param {Function} props.setAttributes  Setter.
 * @param {boolean}  props.autoWidth      The slider sizes slides by their content.
 * @param {boolean}  props.sliderAutoplay The slider plays videos when their slide shows.
 */
export default function BackgroundPanel( {
	attributes,
	setAttributes,
	autoWidth,
	sliderAutoplay,
} ) {
	const bg =
		attributes.background &&
		typeof attributes.background === 'object' &&
		! Array.isArray( attributes.background )
			? attributes.background
			: {};
	const { kind, overlay } = readBackground( bg );
	const update = ( changes ) =>
		setAttributes( { background: { ...bg, ...changes } } );

	// The kind picked here is what gets saved (no legacy "color over image").
	const setKind = ( next ) => {
		const changes = { backgroundType: next };
		if ( next === 'image' ) {
			changes.backgroundOverlayVideo = '';
		} else if ( next === 'video' ) {
			changes.backgroundOverlayImage = '';
		} else {
			changes.backgroundOverlayImage = '';
			changes.backgroundOverlayVideo = '';
		}
		update( changes );
	};
	// Legacy slides store the media kind in the overlay fields; saving the
	// shown kind keeps them drawing the same.
	const updateMedia = ( changes ) =>
		update( { backgroundType: kind, ...changes } );
	// A video from a link: an embed (YouTube…) or a file's address.
	const [ source, setSource ] = useState(
		embedOf( bg.backgroundVideo || {} ) ||
			bg.backgroundVideo?.provider === 'file'
			? 'link'
			: 'library'
	);

	return (
		<PanelBody title={ __( 'Background', 'gutenslider' ) }>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Type', 'gutenslider' ) }
				value={ kind }
				onChange={ setKind }
			>
				<ToggleGroupControlOption
					value="image"
					label={ __( 'Image', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="video"
					label={ __( 'Video', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="color"
					label={ __( 'Color', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="gradient"
					label={ _x( 'Grad.', 'gradient, short', 'gutenslider' ) }
					aria-label={ __( 'Gradient', 'gutenslider' ) }
				/>
				<ToggleGroupControlOption
					value="none"
					label={ _x( 'None', 'background', 'gutenslider' ) }
				/>
			</ToggleGroupControl>

			{ kind === 'image' && (
				<>
					{ /* The focal point picker shows the image: no second preview. */ }
					{ bg.backgroundImage?.url && (
						<FocalPointPicker
							__nextHasNoMarginBottom
							className="gutenslider-focal-point"
							label={ __(
								'Image and focal point',
								'gutenslider'
							) }
							url={ bg.backgroundImage.url }
							value={
								bg.backgroundFocalPoint || { x: 0.5, y: 0.5 }
							}
							onDragEnd={ ( value ) =>
								updateMedia( { backgroundFocalPoint: value } )
							}
							onChange={ ( value ) =>
								updateMedia( { backgroundFocalPoint: value } )
							}
						/>
					) }
					<MediaButton
						media={ bg.backgroundImage }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Choose image', 'gutenslider' ) }
						preview={ false }
						onSelect={ ( media ) =>
							updateMedia( { backgroundImage: media } )
						}
						onRemove={ () =>
							updateMedia( { backgroundImage: {} } )
						}
					/>
					{ ! autoWidth && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Size', 'gutenslider' ) }
							value={ bg.backgroundImageSize || 'cover' }
							options={ FITS }
							onChange={ ( value ) =>
								updateMedia( { backgroundImageSize: value } )
							}
						/>
					) }
					<Overlay
						bg={ bg }
						overlay={ overlay }
						overlayKey="backgroundOverlayImage"
						update={ updateMedia }
					/>
				</>
			) }

			{ kind === 'video' && (
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={ __( 'Video from', 'gutenslider' ) }
					value={ source }
					onChange={ setSource }
				>
					<ToggleGroupControlOption
						value="library"
						label={ __( 'Media Library', 'gutenslider' ) }
					/>
					<ToggleGroupControlOption
						value="link"
						label={ __( 'Link', 'gutenslider' ) }
					/>
				</ToggleGroupControl>
			) }

			{ kind === 'video' && source === 'link' && (
				<VideoLinkFields
					bg={ bg }
					update={ updateMedia }
					sliderAutoplay={ sliderAutoplay }
				/>
			) }

			{ kind === 'video' && source !== 'link' && (
				<>
					<MediaButton
						media={ bg.backgroundVideo }
						allowedTypes={ [ 'video' ] }
						label={ __( 'Choose video', 'gutenslider' ) }
						onSelect={ ( media ) =>
							updateMedia( {
								backgroundVideo: { ...media, embed: false },
							} )
						}
						onRemove={ () =>
							updateMedia( { backgroundVideo: {} } )
						}
					/>
					<BaseControl
						__nextHasNoMarginBottom
						label={ __( 'Poster image', 'gutenslider' ) }
						help={ __(
							'Shows while the video loads, and in the lightbox thumbnails.',
							'gutenslider'
						) }
						id={ undefined }
					>
						<MediaButton
							media={ bg.backgroundImage }
							allowedTypes={ [ 'image' ] }
							label={ __( 'Choose poster', 'gutenslider' ) }
							onSelect={ ( media ) =>
								updateMedia( { backgroundImage: media } )
							}
							onRemove={ () =>
								updateMedia( { backgroundImage: {} } )
							}
						/>
					</BaseControl>
					<VideoAutoplayControl
						bg={ bg }
						update={ updateMedia }
						sliderAutoplay={ sliderAutoplay }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Loop', 'gutenslider' ) }
						checked={ bg.backgroundVideoLoop !== false }
						onChange={ ( value ) =>
							updateMedia( { backgroundVideoLoop: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Muted', 'gutenslider' ) }
						help={ __(
							'Browsers only start videos with sound after a click.',
							'gutenslider'
						) }
						checked={ bg.backgroundVideoMuted !== false }
						onChange={ ( value ) =>
							updateMedia( { backgroundVideoMuted: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Pause when the slide is not shown',
							'gutenslider'
						) }
						checked={
							bg.backgroundVideoPauseWhenInactive !== false
						}
						onChange={ ( value ) =>
							updateMedia( {
								backgroundVideoPauseWhenInactive: value,
							} )
						}
					/>
					{ bg.backgroundVideo?.url && (
						<FocalPointPicker
							__nextHasNoMarginBottom
							className="gutenslider-focal-point"
							label={ __( 'Focal point', 'gutenslider' ) }
							url={ bg.backgroundVideo.url }
							value={
								bg.backgroundVideoFocalPoint || {
									x: 0.5,
									y: 0.5,
								}
							}
							onDragEnd={ ( value ) =>
								updateMedia( {
									backgroundVideoFocalPoint: value,
								} )
							}
							onChange={ ( value ) =>
								updateMedia( {
									backgroundVideoFocalPoint: value,
								} )
							}
						/>
					) }
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Size', 'gutenslider' ) }
						value={ bg.backgroundVideoSize || 'cover' }
						options={ FITS }
						onChange={ ( value ) =>
							updateMedia( { backgroundVideoSize: value } )
						}
					/>
					<Overlay
						bg={ bg }
						overlay={ overlay }
						overlayKey="backgroundOverlayVideo"
						update={ updateMedia }
					/>
				</>
			) }

			{ kind === 'color' && <ColorField bg={ bg } update={ update } /> }
			{ kind === 'gradient' && (
				<GradientField bg={ bg } update={ update } />
			) }

			{ autoWidth && [ 'color', 'gradient', 'none' ].includes( kind ) && (
				<UnitControl
					__next40pxDefaultSize
					label={ __( 'Slide width', 'gutenslider' ) }
					help={ __(
						'Slides without an image or video need a width when the slider sizes slides by their content.',
						'gutenslider'
					) }
					value={ attributes.minWidth || '80%' }
					units={ [
						{ value: '%', label: '%', default: 80 },
						{ value: 'px', label: 'px', default: 400 },
						{ value: 'vw', label: 'vw', default: 50 },
					] }
					onChange={ ( value ) =>
						setAttributes( { minWidth: value } )
					}
				/>
			) }
		</PanelBody>
	);
}
