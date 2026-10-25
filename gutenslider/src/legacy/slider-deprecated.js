/**
 * The slider's markup before 5.0 (saved <InnerBlocks.Content />, with the
 * attributes of that time). Unchanged since then: old posts validate by it.
 */
import { InnerBlocks } from '@wordpress/block-editor';

const v452 = {
	// isEligible( { fadeMode } ) {
	// 	return fadeMode;
	// },
	// migrate( attributes ) {
	// 	const { fadeMode } = attributes;
	// 	if ( fadeMode ) {
	// 		return {
	// 				...attributes,
	// 				fadeMode: false,
	// 				animation: 'fade',
	// 		};
	// 	}
	// 	return attributes;
	// },
	attributes: {
		gsBlockId: {
			type: 'string',
		},
		media: {
			type: 'array',
			default: [],
		},
		align: {
			type: 'string',
			default: 'none',
		},
		bgImageId: {
			type: 'number',
		},
		contentMode: {
			type: 'string',
			default: 'change',
		},
		fadeMode: {
			type: 'boolean',
			default: true,
		},
		slidesToShow: {
			type: 'number',
			default: 1,
		},
		slidesToScroll: {
			type: 'number',
			default: 1,
		},
		sliderHeight: {
			type: 'string',
			default: '50vh',
		},
		isFullScreen: {
			type: 'boolean',
			default: false,
		},
		pauseOnFocus: {
			type: 'boolean',
			default: true,
		},
		pauseOnHover: {
			type: 'boolean',
			default: true,
		},
		pauseOnDotsHover: {
			type: 'boolean',
			default: true,
		},
		enableSpacing: {
			type: 'boolean',
			default: true,
		},
		paddingX: {
			type: 'string',
			default: '40px',
		},
		paddingY: {
			type: 'string',
			default: '40px',
		},
		spacingX: {
			type: 'number',
			default: 40,
		},
		spacingY: {
			type: 'number',
			default: 40,
		},
		spacingXMobile: {
			type: 'number',
			default: 40,
		},
		spacingYMobile: {
			type: 'number',
			default: 40,
		},
		spacingXTablet: {
			type: 'number',
			default: 40,
		},
		spacingYTablet: {
			type: 'number',
			default: 40,
		},
		spacingXDesktop: {
			type: 'number',
			default: 40,
		},
		spacingYDesktop: {
			type: 'number',
			default: 40,
		},
		spacingYUnit: {
			type: 'string',
			default: 'px',
		},
		spacingXUnit: {
			type: 'string',
			default: 'px',
		},
		autoplay: {
			type: 'boolean',
			default: true,
		},
		duration: {
			type: 'number',
			default: 3,
		},
		fadeSpeed: {
			type: 'number',
			default: 0.6,
		},
		arrows: {
			type: 'boolean',
			default: true,
		},
		arrowSize: {
			type: 'number',
			default: 30,
		},
		arrowColor: {
			type: 'string',
			default: '#ffffff',
		},
		arrowStyle: {
			type: 'string',
			default: 'arrow-style-1',
		},
		arrowBgColor: {
			type: 'string',
			default: 'transparent',
		},
		arrowHoverColor: {
			type: 'string',
			default: '#eeeeee',
		},
		arrowBgHoverColor: {
			type: 'string',
			default: 'transparent',
		},
		arrowXOffset: {
			type: 'number',
			default: 10,
		},
		arrowYOffset: {
			type: 'number',
			default: 0,
		},
		arrowPosition: {
			type: 'string',
			default: 'arrow-position-sides',
		},
		arrowMixBlendMode: {
			type: 'string',
			default: 'none',
		},
		dots: {
			type: 'boolean',
			default: true,
		},
		dotSize: {
			type: 'number',
			default: 25,
		},
		dotColor: {
			type: 'string',
			default: '#ffffff',
		},
		dotStyle: {
			type: 'string',
			default: 'dot-style-1',
		},
		hasParallax: {
			type: 'boolean',
			default: false,
		},
		parallaxDirection: {
			type: 'string',
			default: 'down',
		},
		parallaxAmount: {
			type: 'number',
			default: 1.3,
		},
		overlayColor: {
			type: 'string',
		},
		dimRatio: {
			type: 'number',
			default: 0.5,
		},
		rgbaBackground: {
			type: 'string',
			default: '',
		},
		textColor: {
			type: 'string',
		},
		mixBlendMode: {
			type: 'string',
			default: 'mb-none',
		},
		contentOpacity: {
			type: 'number',
			default: 1,
		},
		verticalAlign: {
			type: 'string',
			default: 'center',
		},
		loop: {
			type: 'boolean',
			default: true,
		},
		visibleOnDesktop: {
			type: 'boolean',
			default: true,
		},
		visibleOnTablet: {
			type: 'boolean',
			default: true,
		},
		visibleOnMobile: {
			type: 'boolean',
			default: true,
		},
		adaptiveHeight: {
			type: 'boolean',
			default: false,
		},
		contentPosition: {
			type: 'string',
		},
		autoCaption: {
			type: 'string',
			default: 'none',
		},
		arrowXSpacing: {
			type: 'number',
			default: 0,
		},
	},
	save() {
		return <InnerBlocks.Content />;
	},
};

const deprecated = [ v452 ];
export default deprecated;
