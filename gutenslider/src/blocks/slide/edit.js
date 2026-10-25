/**
 * The slide block in the editor: its background as the front end draws it,
 * and its content (any blocks) on top.
 */
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InnerBlocks,
	InspectorAdvancedControls,
	InspectorControls,
	MediaReplaceFlow,
	useBlockProps,
	useInnerBlocksProps,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalBlockAlignmentMatrixControl as BlockAlignmentMatrixControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalLinkControl as LinkControl,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Popover,
	TextControl,
	ToggleControl,
	ToolbarButton,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { link as linkIcon } from '@wordpress/icons';

import { slideParts } from '../slider/markup';
import BackgroundPanel, { pickMedia, readBackground } from './background';
import EmbedMedia from './embed-media';

export default function SlideEdit( {
	attributes,
	setAttributes,
	clientId,
	context,
	isSelected,
} ) {
	const { contentPosition, linkUrl, opensInNewTab, hashId, isHidden } =
		attributes;
	const parts = slideParts( attributes, context );
	const { kind } = readBackground( attributes.background || {} );
	const [ linkOpen, setLinkOpen ] = useState( false );
	const [ linkAnchor, setLinkAnchor ] = useState( null );

	const { index, hasContent, active } = useSelect(
		( select ) => {
			const { getBlockIndex, getBlockCount, hasSelectedInnerBlock } =
				select( blockEditorStore );
			return {
				index: getBlockIndex( clientId ),
				hasContent: getBlockCount( clientId ) > 0,
				active: hasSelectedInnerBlock( clientId, true ),
			};
		},
		[ clientId ]
	);

	const autoWidth = [
		context[ 'gutenslider/slidesToShow' ],
		context[ 'gutenslider/slidesToShowMd' ],
		context[ 'gutenslider/slidesToShowSm' ],
	].some( ( v ) => String( v ) === '0' );

	const blockProps = useBlockProps( {
		className: [ ...parts.classes, isHidden && 'gutenslider-is-hidden' ]
			.filter( Boolean )
			.join( ' ' ),
		style: { ...parts.style, '--gs-i': index },
		'data-gs-index': index,
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'gutenslider-slide-blocks' },
		{
			// No template: existing slides without content stay without it.
			// An empty slide offers "add a block" while it is selected.
			renderAppender:
				! hasContent && ( isSelected || active )
					? InnerBlocks.ButtonBlockAppender
					: false,
		}
	);

	const bg = attributes.background || {};
	const media = kind === 'video' ? bg.backgroundVideo : bg.backgroundImage;

	return (
		<>
			<BlockControls group="block">
				<BlockAlignmentMatrixControl
					label={ __( 'Content position', 'gutenslider' ) }
					value={ contentPosition || 'center center' }
					onChange={ ( value ) =>
						setAttributes( { contentPosition: value } )
					}
				/>
				<ToolbarButton
					ref={ setLinkAnchor }
					icon={ linkIcon }
					label={ __( 'Link the slide', 'gutenslider' ) }
					isPressed={ !! linkUrl }
					onClick={ () => setLinkOpen( ( open ) => ! open ) }
				/>
			</BlockControls>
			{ [ 'image', 'video' ].includes( kind ) && ! parts.embed && (
				<BlockControls group="other">
					<MediaReplaceFlow
						mediaId={ media?.id }
						mediaURL={ media?.url }
						allowedTypes={ [ kind ] }
						accept={ `${ kind }/*` }
						onSelect={ ( item ) =>
							setAttributes( {
								background: {
									...bg,
									backgroundType: kind,
									[ kind === 'video'
										? 'backgroundVideo'
										: 'backgroundImage' ]:
										pickMedia( item ),
								},
							} )
						}
						name={
							media?.url
								? __( 'Replace', 'gutenslider' )
								: __( 'Add media', 'gutenslider' )
						}
					/>
				</BlockControls>
			) }
			{ linkOpen && isSelected && (
				<Popover
					anchor={ linkAnchor }
					placement="bottom"
					onClose={ () => setLinkOpen( false ) }
					focusOnMount="firstElement"
				>
					<LinkControl
						value={ { url: linkUrl, opensInNewTab } }
						onChange={ ( { url, opensInNewTab: newTab } ) =>
							setAttributes( {
								linkUrl: url,
								opensInNewTab: !! newTab,
							} )
						}
						onRemove={ () => {
							setAttributes( {
								linkUrl: '',
								opensInNewTab: false,
							} );
							setLinkOpen( false );
						} }
					/>
				</Popover>
			) }

			<InspectorControls>
				<BackgroundPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					autoWidth={ autoWidth }
					sliderAutoplay={
						context[ 'gutenslider/videoAutoplay' ] !== false
					}
				/>
			</InspectorControls>
			<InspectorAdvancedControls>
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Hide this slide', 'gutenslider' ) }
					help={ __(
						'Hidden slides stay in the editor, but visitors do not see them.',
						'gutenslider'
					) }
					checked={ !! isHidden }
					onChange={ ( value ) =>
						setAttributes( { isHidden: value } )
					}
				/>
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Slide link name', 'gutenslider' ) }
					help={ __(
						'With hash navigation on (slider settings), the address ends in #this-name while the slide shows. Empty: numbered.',
						'gutenslider'
					) }
					value={ hashId || '' }
					onChange={ ( value ) =>
						setAttributes( {
							hashId: value.replace( /[^A-Za-z0-9_-]/g, '-' ),
						} )
					}
				/>
			</InspectorAdvancedControls>

			<div { ...blockProps }>
				<div
					className={ [
						'eedee-background-div',
						parts.image && 'bg-image',
						( parts.video || parts.embed ) && 'bg-video',
						! [ 'image', 'video' ].includes( parts.type ) &&
							'no-media-background',
					]
						.filter( Boolean )
						.join( ' ' ) }
				>
					{ parts.embed && <EmbedMedia embed={ parts.embed } /> }
					{ parts.image && (
						<img
							className="gs-slide-media"
							src={ parts.image.url }
							alt={ parts.image.alt || '' }
							width={ parts.image.width }
							height={ parts.image.height }
							style={ {
								objectFit: parts.image.fit,
								objectPosition: parts.image.position,
							} }
							draggable={ false }
						/>
					) }
					{ parts.video && (
						<video
							className="gs-slide-media"
							src={ parts.video.url }
							poster={ parts.video.poster }
							style={ {
								objectFit: parts.video.fit,
								objectPosition: parts.video.position,
							} }
							autoPlay={ parts.video.autoplay }
							muted
							loop
							playsInline
						/>
					) }
					<div
						className="eedee-background-div__overlay"
						style={ parts.overlay }
					/>
				</div>
				<div className="slide-content">
					<div { ...innerBlocksProps } />
				</div>
				{ isHidden && (
					<span className="gutenslider-badge">
						{ __( 'Hidden', 'gutenslider' ) }
					</span>
				) }
				{ linkUrl && (
					<span className="gutenslider-badge gutenslider-badge--link">
						{ __( 'Linked', 'gutenslider' ) }
					</span>
				) }
			</div>
		</>
	);
}
