/**
 * The slide's saved markup before 5.0 (4.5.2), with the helpers it used
 * then, unchanged: old posts validate by it. Not used for anything else.
 */
import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Class names from strings and falsy values (what `classnames` did here).
 *
 * @param {...*} names Names.
 * @return {string} Classes.
 */
const cx = ( ...names ) => names.filter( Boolean ).join( ' ' );

const POSITION_CLASSNAMES = {
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

const ASPECT_RATIOS = [
	{ ratio: '2.33', className: 'wp-embed-aspect-21-9' },
	{ ratio: '2.00', className: 'wp-embed-aspect-18-9' },
	{ ratio: '1.78', className: 'wp-embed-aspect-16-9' },
	{ ratio: '1.33', className: 'wp-embed-aspect-4-3' },
	{ ratio: '1.00', className: 'wp-embed-aspect-1-1' },
	{ ratio: '0.56', className: 'wp-embed-aspect-9-16' },
	{ ratio: '0.50', className: 'wp-embed-aspect-1-2' },
];

function getEmbedClassNames( html ) {
	const doc = document.implementation.createHTMLDocument( '' );
	doc.body.innerHTML = html;
	const iframe = doc.body.querySelector( 'iframe' );
	if ( iframe && iframe.height && iframe.width ) {
		const aspectRatio = ( iframe.width / iframe.height ).toFixed( 2 );
		const match = ASPECT_RATIOS.find( ( r ) => aspectRatio >= r.ratio );
		if ( match ) {
			return cx( match.className, 'wp-has-aspect-ratio' );
		}
	}
	return '';
}

export const defaultBackground = {
	backgroundType: 'color',
	backgroundColor: '#eeeeee',
	backgroundOverlayImage: '',
	backgroundOverlayVideo: '',
	backgroundOverlayOpacity: 50,
	backgroundGradient: {},
	backgroundImage: {},
	backgroundPosition: 'center center',
	backgroundRepeat: 'no-repeat',
	backgroundImageSize: 'cover',
	backgroundVideoSize: 'cover',
	customBackgroundColor: '',
	hasParallax: false,
	backgroundFocalPoint: { x: 0.5, y: 0.5 },
	backgroundVideoFocalPoint: { x: 0.5, y: 0.5 },
	backgroundVideo: {},
	backgroundVideoMuted: true,
	backgroundVideoLoop: true,
	backgroundVideoPauseWhenInactive: true,
	backgroundVideoAutoplay: true,
	openPopover: true,
};

function Save( props ) {
	const { background } = props;

	const {
		backgroundColor = '#fffa',
		backgroundGradient = '',
		backgroundType = 'color',
		backgroundImage = {},
		backgroundFocalPoint = { x: 0.5, y: 0.5 },
		backgroundVideoFocalPoint = { x: 0.5, y: 0.5 },
		backgroundImageSize = 'cover',
		backgroundVideoSize = 'cover',
		backgroundVideo = {},
		backgroundVideoLoop = true,
		backgroundVideoMuted = true,
		backgroundOverlayImage = '',
		backgroundOverlayVideo = '',
		backgroundOverlayOpacity = 50,
	} = background;

	const backgroundStyle = () => {
		const ret = {
			opacity: 1,
		};

		if (
			backgroundType === 'color' ||
			backgroundOverlayImage === 'color' ||
			backgroundOverlayVideo === 'color'
		) {
			ret.background = backgroundColor;
		} else if (
			backgroundType === 'gradient' ||
			backgroundOverlayImage === 'gradient' ||
			backgroundOverlayVideo === 'gradient'
		) {
			ret.background = backgroundGradient;
		}

		if (
			backgroundOverlayImage === 'color' ||
			backgroundOverlayImage === 'gradient' ||
			backgroundOverlayVideo === 'color' ||
			backgroundOverlayVideo === 'gradient'
		) {
			ret.opacity = `${ backgroundOverlayOpacity / 100 }`;
		}

		return ret;
	};

	const imageStyle = {
		objectFit: backgroundImageSize,
		objectPosition: `${ backgroundFocalPoint.x * 100 }% ${ backgroundFocalPoint.y * 100 }%`,
	};

	const videoStyle = {
		objectFit: backgroundVideoSize,
		objectPosition: `${ backgroundVideoFocalPoint.x * 100 }% ${ backgroundVideoFocalPoint.y * 100 }%`,
	};

	const hasNoMediaBackground = () =>
		backgroundType !== 'image' && backgroundType !== 'video';
	// eslint-disable-next-line no-unused-vars -- kept as 6.x had it
	const hasEmbedBackground = () =>
		backgroundType === 'video' &&
		backgroundVideo.url &&
		backgroundVideo.embed &&
		backgroundVideo.embedData;

	let embedClassnames = '';
	if ( backgroundType === 'video' && backgroundVideo.embedData ) {
		embedClassnames = getEmbedClassNames( backgroundVideo.embedData.html );
	}

	const classes = cx(
		'eedee-background-div',
		hasNoMediaBackground() && 'no-media-background',
		embedClassnames
	);

	return (
		<div className={ classes }>
			{ ( backgroundType === 'image' ||
				( backgroundType === 'color' &&
					backgroundOverlayImage === 'color' ) ||
				( backgroundType === 'gradient' &&
					backgroundOverlayImage === 'gradient' ) ) &&
				backgroundImage.url && (
					<img
						className={ `wp-image-${ backgroundImage.id } swiper-zoom-target` }
						src={ backgroundImage.url }
						alt={ backgroundImage.alt }
						style={ imageStyle }
					/>
				) }
			{ ( ( backgroundType === 'video' && ! backgroundVideo.embed ) ||
				( backgroundType === 'color' &&
					backgroundOverlayVideo === 'color' ) ||
				( backgroundType === 'gradient' &&
					backgroundOverlayVideo === 'gradient' ) ) &&
				backgroundVideo.url && (
					<video
						className="swiper-zoom-target"
						src={ backgroundVideo.url }
						autoPlay={ true }
						playsInline={ true }
						loop={ backgroundVideoLoop }
						muted={ backgroundVideoMuted }
						poster={ backgroundImage && backgroundImage.url }
						style={ videoStyle }
					/>
				) }
			{ ( ( backgroundType === 'video' && backgroundVideo.embed ) ||
				( backgroundType === 'color' &&
					backgroundOverlayVideo === 'color' ) ||
				( backgroundType === 'gradient' &&
					backgroundOverlayVideo === 'gradient' ) ) &&
				backgroundVideo.url &&
				backgroundVideo.embed &&
				backgroundVideo.embedData && (
					<div
						className="wp-block-embed__wrapper"
						dangerouslySetInnerHTML={ {
							__html: backgroundVideo.embedData.html,
						} }
					/>
				) }
			<div
				className="eedee-background-div__overlay"
				style={ backgroundStyle() }
			/>
		</div>
	);
}

const BackgroundDiv = Save;

// eslint-disable-next-line no-unused-vars -- 6.x never registered it
const v500 = {
	attributes: {
		gsBlockId: {
			type: 'string',
			default: '',
		},
		background: {
			type: 'object',
			default: defaultBackground,
		},
		isEditable: {
			type: 'boolean',
			default: true,
		},
		mediaUrl: {
			type: 'string',
			source: 'attribute',
			selector: '.slide-bg img, .slide-bg video',
			attribute: 'src',
		},
		mediaAlt: {
			type: 'string',
			source: 'attribute',
			selector: '.slide-bg img',
			attribute: 'alt',
			default: '',
		},
		mediaType: {
			type: 'string',
		},
		mediaId: {
			type: 'number',
		},
		overlayColor: {
			type: 'string',
			default: '',
		},
		dimRatio: {
			type: 'number',
			default: 0.5,
		},
		rgbaBackground: {
			type: 'string',
			default: '',
		},
		initialized: {
			type: 'boolean',
			default: false,
		},
		linkUrl: {
			type: 'string',
			default: '',
		},
		verticalAlign: {
			type: 'string',
			default: 'center',
		},
		contentPosition: {
			type: 'string',
			default: 'center',
		},
		autoCaption: {
			type: 'string',
			default: 'none',
		},
		minWidth: {
			type: 'string',
			default: '67%',
		},
		mixBlendMode: {
			type: 'string',
			default: 'none',
		},
	},
	save() {
		return <div className="yeah"></div>;
	},
};

const v452 = {
	attributes: {
		gsBlockId: {
			type: 'string',
		},
		background: {
			type: 'object',
			default: defaultBackground,
		},
		isEditable: {
			type: 'boolean',
			default: true,
		},
		mediaUrl: {
			type: 'string',
			source: 'attribute',
			selector: '.slide-bg img, .slide-bg video',
			attribute: 'src',
		},
		mediaAlt: {
			type: 'string',
			source: 'attribute',
			selector: '.slide-bg img',
			attribute: 'alt',
			default: '',
		},
		mediaType: {
			type: 'string',
		},
		mediaId: {
			type: 'number',
		},
		overlayColor: {
			type: 'string',
			default: '',
		},
		dimRatio: {
			type: 'number',
			default: 0.5,
		},
		rgbaBackground: {
			type: 'string',
			default: '',
		},
		initialized: {
			type: 'boolean',
			default: false,
		},
		linkUrl: {
			type: 'string',
			default: '',
		},
		verticalAlign: {
			type: 'string',
			default: 'center',
		},
		contentPosition: {
			type: 'string',
			default: 'center',
		},
		autoCaption: {
			type: 'string',
			default: 'none',
		},
	},
	save( { attributes } ) {
		const {
			linkUrl,
			verticalAlign,
			background,
			contentPosition,
			gsBlockId,
		} = attributes;

		const linkTo =
			typeof linkUrl !== 'undefined' && linkUrl && linkUrl !== ''
				? encodeURI( linkUrl )
				: false;

		const linkifyButton = ( jsxElements ) => {
			return (
				<>
					{ linkTo && (
						<a className="slide-link" href={ linkTo }>
							{ ' ' }
							{ jsxElements }
						</a>
					) }
				</>
			);
		};

		const classes = cx(
			'wp-block-eedee-block-gutenslide',
			verticalAlign && `vertical-align-${ verticalAlign }`,
			POSITION_CLASSNAMES[ contentPosition ]
		);

		return (
			<div className={ classes }>
				<div id={ `gutenslide-${ gsBlockId }` }>
					<BackgroundDiv background={ background } />
					<div className="slide-content">
						<InnerBlocks.Content />
					</div>
					{ linkifyButton() }
				</div>
			</div>
		);
	},
};

const deprecated = [ v452 ];
export default deprecated;
