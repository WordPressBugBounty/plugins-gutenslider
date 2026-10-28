<?php
/**
 * Front-end markup for the slider and slide blocks.
 *
 * The markup and class names are the ones 6.x printed, so existing custom CSS
 * keeps matching. What changed: every value is escaped, images come with
 * srcset/sizes and loading hints, fixed content is rendered once instead of
 * twice, and the slider carries Interactivity API directives instead of
 * waiting for a DOMContentLoaded script.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders both blocks.
 */
final class Render {

	const POSITIONS = array(
		'top left'      => 'is-position-top-left',
		'top center'    => 'is-position-top-center',
		'top right'     => 'is-position-top-right',
		'center left'   => 'is-position-center-left',
		'center center' => 'is-position-center-center',
		'center'        => 'is-position-center-center',
		'center right'  => 'is-position-center-right',
		'bottom left'   => 'is-position-bottom-left',
		'bottom center' => 'is-position-bottom-center',
		'bottom right'  => 'is-position-bottom-right',
	);

	/** What an effect description has, unless it says otherwise. */
	const EFFECT_DEFAULTS = array(
		'single'    => false,
		'stacked'   => false,
		'centered'  => false,
		'gap'       => true,
		'placement' => true,
		'dividers'  => true,
		'base'      => '',
		'module'    => '',
		'motion'    => false,
		'settings'  => array(),
	);

	/**
	 * How many sliders this request has rendered; the first one gets the
	 * eager, high-priority first image (it is most likely the LCP element).
	 *
	 * @var int
	 */
	private static $sliders = 0;

	/**
	 * A CSS value from a block attribute: lengths, colors, gradients and
	 * var() references pass, anything that could close the declaration or the
	 * attribute does not.
	 *
	 * @param mixed  $value    Attribute value.
	 * @param string $fallback Used when the value is empty or unsafe.
	 * @return string
	 */
	public static function css( $value, $fallback = '' ) {
		if ( is_bool( $value ) || is_array( $value ) || null === $value ) {
			return $fallback;
		}
		$value = trim( (string) $value );
		if ( '' === $value || preg_match( '/[;{}<>"\\\\]|\/\*|url\s*\(|expression\s*\(/i', $value ) ) {
			return $fallback;
		}
		return $value;
	}

	/**
	 * A number for a CSS custom property.
	 *
	 * @param mixed $value    Attribute value.
	 * @param float $fallback Used when the value is not numeric.
	 * @return string
	 */
	private static function num( $value, $fallback = 0 ) {
		return (string) ( is_numeric( $value ) ? 0 + $value : $fallback );
	}

	/**
	 * Attributes merged over the block.json defaults (render_block passes
	 * defaults already, this also covers direct calls from other code).
	 *
	 * @param array  $attributes Saved attributes.
	 * @param string $name       Block name.
	 * @return array
	 */
	private static function with_defaults( $attributes, $name ) {
		$type     = \WP_Block_Type_Registry::get_instance()->get_registered( $name );
		$defaults = array();
		if ( $type ) {
			foreach ( $type->attributes as $key => $schema ) {
				if ( array_key_exists( 'default', $schema ) ) {
					$defaults[ $key ] = $schema['default'];
				}
			}
		}
		return array_merge( $defaults, is_array( $attributes ) ? $attributes : array() );
	}

	/**
	 * The slide effects and how each lays out the slides. Another plugin adds
	 * its own with the `gutenslider_effects` filter; keys of a description:
	 * `single` (one slide at a time), `stacked` (the slides on top of each
	 * other), `centered` (the active slide in the middle), `gap` (false: no
	 * space between slides), `placement` (false: no blocks below or above
	 * the image), `dividers` (false: no shape dividers), `base` (the effect
	 * Swiper runs underneath), `module` (the view module that draws it, see
	 * view_module_urls()), `motion` (true: the module is skipped under
	 * reduced motion, `base` runs alone), `settings` (added to the slider's
	 * settings).
	 *
	 * @return array<string, array> Descriptions by `animation` value.
	 */
	public static function effects() {
		$effects = apply_filters(
			'gutenslider_effects',
			array(
				'slide' => array(),
				'fade'  => array(
					'single'  => true,
					'stacked' => true,
				),
				'flip'  => array(
					'single'   => true,
					'stacked'  => true,
					'dividers' => false,
				),
			)
		);
		$out = array();
		foreach ( is_array( $effects ) ? $effects : array() as $name => $effect ) {
			if ( is_string( $name ) && is_array( $effect ) ) {
				$out[ $name ] = array_merge( self::EFFECT_DEFAULTS, $effect );
			}
		}
		return $out;
	}

	/**
	 * Swiper's slidesPerView for one breakpoint: 0 means "auto".
	 *
	 * @param array $effect The slider's effect (see effects()).
	 * @param mixed $slides slidesToShow value for the breakpoint.
	 * @return float|int|string
	 */
	private static function per_view( $effect, $slides ) {
		if ( $effect['single'] ) {
			return 1;
		}
		if ( 0 === (int) $slides && '0' === (string) $slides ) {
			return 'auto';
		}
		return max( 1, (float) $slides );
	}

	/**
	 * The slider block.
	 *
	 * @param array     $attributes Block attributes.
	 * @param string    $content    Rendered inner blocks.
	 * @param \WP_Block $block      Block instance.
	 * @return string
	 */
	public static function slider( $attributes, $content, $block ) {
		$attr    = self::with_defaults( $attributes, 'eedee/block-gutenslider' );
		$effects = self::effects();
		// An effect nothing here draws: the slides slide.
		if ( ! isset( $effects[ $attr['animation'] ] ) ) {
			$attr['animation'] = 'slide';
		}
		$effect = $effects[ $attr['animation'] ] ?? self::EFFECT_DEFAULTS;
		++self::$sliders;

		$block_id = preg_replace( '/[^A-Za-z0-9_-]/', '', (string) ( $attr['gsBlockId'] ?? '' ) );
		if ( '' === $block_id ) {
			$block_id = 'gs' . self::$sliders . substr( md5( wp_json_encode( $attributes ) ), 0, 6 );
		}
		$dom_id = ! empty( $attr['anchor'] ) ? sanitize_html_class( $attr['anchor'] ) : 'gutenslider-' . $block_id;

		$animation = sanitize_key( $attr['animation'] );
		$per_lg    = self::per_view( $effect, $attr['slidesToShow'] );
		$per_md    = self::per_view( $effect, $attr['slidesToShowMd'] );
		$per_sm    = self::per_view( $effect, $attr['slidesToShowSm'] );
		$is_fixed  = 'fixed' === $attr['contentMode'];

		// Classes, in the order and with the names 6.x used.
		$classes = array( 'gs-frontend', 'content-' . sanitize_html_class( $attr['contentMode'] ) );
		foreach ( array( 'adaptiveHeight' => 'adaptive-height', 'adaptiveHeightMd' => 'adaptive-height-md', 'adaptiveHeightSm' => 'adaptive-height-sm' ) as $key => $class ) {
			if ( ! empty( $attr[ $key ] ) ) {
				$classes[] = $class;
			}
		}
		if ( ! empty( $attr['isFullScreen'] ) ) {
			$classes[] = 'is-full';
		}
		$classes[] = sanitize_html_class( $attr['arrowStyle'] );
		$classes[] = sanitize_html_class( $attr['arrowPosition'] );
		$classes[] = 'arrow-mb-' . sanitize_html_class( $attr['arrowMixBlendMode'] );
		foreach ( array( '' => 'lg', 'Md' => 'md', 'Sm' => 'sm' ) as $suffix => $size ) {
			$classes[] = ! empty( $attr[ 'arrows' . $suffix ] ) ? "arrows-$size" : "arrows-$size-none";
		}
		$classes[] = sanitize_html_class( $attr['dotStyle'] );
		foreach ( array( '' => 'lg', 'Md' => 'md', 'Sm' => 'sm' ) as $suffix => $size ) {
			$classes[] = ! empty( $attr[ 'dots' . $suffix ] ) ? "dots-$size" : "dots-$size-none";
		}
		$classes[] = sanitize_html_class( $attr['dotPosition'] );
		if ( isset( self::POSITIONS[ $attr['contentPosition'] ] ) ) {
			$classes[] = self::POSITIONS[ $attr['contentPosition'] ];
		}
		foreach ( array( 'visibleOnDesktop' => 'ed-desktop-hidden', 'visibleOnTablet' => 'ed-tablet-hidden', 'visibleOnMobile' => 'ed-mobile-hidden' ) as $key => $class ) {
			if ( isset( $attr[ $key ] ) && ! $attr[ $key ] ) {
				$classes[] = $class;
			}
		}
		$classes[] = 'mb-' . sanitize_html_class( $attr['mixBlendMode'] );
		if ( ! empty( $attr['firstNotLazy'] ) ) {
			$classes[] = 'gs-first-not-lazy';
		}
		if ( ! empty( $attr['wrapAutoHeight'] ) ) {
			$classes[] = 'wrap-auto-height';
		}
		// Known before JavaScript runs, so CSS can lay the slides out at once:
		// auto width or a number of slides per breakpoint (the styles use
		// these). The 6.x class, from the mobile value, stays for custom CSS.
		$classes[] = 'auto' === $per_sm ? 'slides-auto' : 'slides-number';
		foreach ( array( 'sm' => $per_sm, 'md' => $per_md, 'lg' => $per_lg ) as $band => $per ) {
			$classes[] = ( 'auto' === $per ? 'slides-auto-' : 'slides-number-' ) . $band;
		}
		$classes[] = 'effect-' . $animation;
		if ( $effect['base'] ) {
			// The underlying effect's layout before JavaScript runs.
			$classes[] = 'effect-' . sanitize_html_class( $effect['base'] );
		}
		if ( $effect['single'] ) {
			$classes[] = 'gs-single';
		}
		if ( $effect['stacked'] ) {
			$classes[] = 'gs-stacked';
		}
		$centered = ! empty( $attr['centeredSlides'] ) || $effect['centered'];
		// The centered first-paint offset only applies where the slides are a
		// number per view (layout.scss).
		if ( $centered ) {
			$classes[] = 'gs-centered';
		}
		if ( ! empty( $attr['hasLg'] ) ) {
			$classes[] = 'gs-has-lightbox';
		}
		// The slide's blocks below or above the image (per-slide content only;
		// not where the slides underneath show through the blocks).
		if ( ! $is_fixed && in_array( $attr['contentPlacement'], array( 'below', 'above' ), true ) && $effect['placement'] ) {
			$classes[] = 'gs-content-' . $attr['contentPlacement'];
		}
		// The blocks line up with the theme's wide or content width.
		if ( in_array( $attr['contentWidth'] ?? 'full', array( 'wide', 'content' ), true ) ) {
			$classes[] = 'gs-content-width-' . $attr['contentWidth'];
		}
		/**
		 * The slider's classes.
		 *
		 * @param string[] $classes Classes.
		 * @param array    $attr    Slider attributes.
		 */
		$classes = (array) apply_filters( 'gutenslider_slider_classes', $classes, $attr );

		$gap = self::block_gap( $attr );
		$div = $attr['dividers'] ?? array();

		$vars = array(
			'--gutenslider-min-height'           => self::css( $attr['sliderHeight'], '50vh' ),
			'--gutenslider-min-height-md'        => self::css( $attr['sliderHeightMd'], '50vh' ),
			'--gutenslider-min-height-sm'        => self::css( $attr['sliderHeightSm'], '50vh' ),
			'--gutenslider-arrow-size'           => self::num( $attr['arrowSize'], 30 ) . 'px',
			'--gutenslider-arrow-size-md'        => self::num( $attr['arrowSizeMd'], 30 ) . 'px',
			'--gutenslider-arrow-size-sm'        => self::num( $attr['arrowSizeSm'], 30 ) . 'px',
			'--gutenslider-dot-size'             => self::num( $attr['dotSize'], 25 ) . 'px',
			'--gutenslider-dot-size-md'          => self::num( $attr['dotSizeMd'], 25 ) . 'px',
			'--gutenslider-dot-size-sm'          => self::num( $attr['dotSizeSm'], 25 ) . 'px',
			'--gutenslider-arrow-color'          => self::css( $attr['arrowColor'], '#fff' ),
			'--gutenslider-dot-color'            => self::css( $attr['dotColor'], '#fff' ),
			'--gutenslider-arrow-bg-color'       => self::css( $attr['arrowBgColor'], 'transparent' ),
			'--gutenslider-arrow-hover-color'    => self::css( $attr['arrowHoverColor'], '#eee' ),
			'--gutenslider-arrow-bg-hover-color' => self::css( $attr['arrowBgHoverColor'], 'transparent' ),
			'--gutenslider-arrow-x-offset'       => self::num( $attr['arrowXOffset'] ) . 'px',
			'--gutenslider-arrow-x-offset-md'    => self::num( $attr['arrowXOffsetMd'] ) . 'px',
			'--gutenslider-arrow-x-offset-sm'    => self::num( $attr['arrowXOffsetSm'] ) . 'px',
			'--gutenslider-arrow-y-offset'       => self::num( $attr['arrowYOffset'] ) . 'px',
			'--gutenslider-arrow-y-offset-md'    => self::num( $attr['arrowYOffsetMd'] ) . 'px',
			'--gutenslider-arrow-y-offset-sm'    => self::num( $attr['arrowYOffsetSm'] ) . 'px',
			'--gutenslider-arrow-x-spacing'      => self::num( $attr['arrowXSpacing'] ) . 'px',
			'--gutenslider-dot-y-offset'         => self::num( $attr['dotYOffset'] ) . 'px',
			'--gutenslider-dot-y-offset-md'      => self::num( $attr['dotYOffsetMd'] ) . 'px',
			'--gutenslider-dot-y-offset-sm'      => self::num( $attr['dotYOffsetSm'] ) . 'px',
			'--gutenslider-padding-x'            => self::css( $attr['paddingX'], '40px' ),
			'--gutenslider-padding-x-md'         => self::css( $attr['paddingXMd'], '40px' ),
			'--gutenslider-padding-x-sm'         => self::css( $attr['paddingXSm'], '20px' ),
			'--gutenslider-padding-y'            => self::css( $attr['paddingY'], '40px' ),
			'--gutenslider-padding-y-md'         => self::css( $attr['paddingYMd'], '40px' ),
			'--gutenslider-padding-y-sm'         => self::css( $attr['paddingYSm'], '20px' ),
			'--gutenslider-margin-x'             => self::css( $attr['marginX'], '0px' ),
			'--gutenslider-margin-x-md'          => self::css( $attr['marginXMd'], '0px' ),
			'--gutenslider-margin-x-sm'          => self::css( $attr['marginXSm'], '0px' ),
			'--gutenslider-margin-y'             => self::css( $attr['marginY'], '0px' ),
			'--gutenslider-margin-y-md'          => self::css( $attr['marginYMd'], '0px' ),
			'--gutenslider-margin-y-sm'          => self::css( $attr['marginYSm'], '0px' ),
			'--gutenslider-divider-top'          => self::num( $div['top']['height'] ?? 60, 60 ) . 'px',
			'--gutenslider-divider-bottom'       => self::num( $div['bottom']['height'] ?? 60, 60 ) . 'px',
			'--gutenslider-lightgallery-bg'      => self::css( $attr['lgBgColor'], '#fff' ),
			'--gutenslider-lightgallery-font'    => self::css( $attr['lgFontColor'], '#000' ),
			'--gs-first-pos'                     => self::css( $attr['bgImagePos'], '50% 50%' ),
			'--gs-gap-vertical'                  => $gap[0],
			'--gs-gap-horizontal'                => $gap[1],
			// New in 7.0: the layout before Swiper runs (no layout shift).
			'--gs-per-view'                      => 'auto' === $per_lg ? 'auto' : (string) $per_lg,
			'--gs-per-view-md'                   => 'auto' === $per_md ? 'auto' : (string) $per_md,
			'--gs-per-view-sm'                   => 'auto' === $per_sm ? 'auto' : (string) $per_sm,
			'--gs-space'                         => ( $effect['gap'] ? (int) $attr['spaceBetween'] : 0 ) . 'px',
			'--gs-space-md'                      => ( $effect['gap'] ? (int) $attr['spaceBetweenMd'] : 0 ) . 'px',
			'--gs-space-sm'                      => ( $effect['gap'] ? (int) $attr['spaceBetweenSm'] : 0 ) . 'px',
			'--gs-speed'                         => self::num( $attr['fadeSpeed'], 0.7 ) . 's',
		);
		/**
		 * The slider's custom properties. Values must be safe CSS (see css()).
		 *
		 * @param array<string, string> $vars Custom properties.
		 * @param array                 $attr Slider attributes.
		 */
		$vars  = (array) apply_filters( 'gutenslider_slider_vars', $vars, $attr );
		$style = '';
		foreach ( $vars as $name => $value ) {
			if ( is_string( $name ) && preg_match( '/^--[A-Za-z0-9_-]+$/', $name ) ) {
				$style .= $name . ':' . self::css( $value ) . ';';
			}
		}

		$settings = self::settings( $attr, $effect, $dom_id, $per_lg, $per_md, $per_sm );

		// Split slides from fixed content (6.x printed everything twice).
		$slides = '';
		$fixed  = '';
		foreach ( $block->inner_blocks as $inner ) {
			$html = $inner->render();
			if ( 'eedee/block-gutenslide' === $inner->name ) {
				$slides .= $html;
			} else {
				$fixed .= $html;
			}
		}
		if ( ! $block->inner_blocks && $content ) {
			$slides = $content;
		}
		// Auto width + centered: the first slide's ratio centers it before
		// Swiper runs (layout.scss). Not with random order: the first slide
		// is picked in the browser.
		if ( $centered && empty( $attr['randomOrder'] ) && in_array( 'auto', array( $per_sm, $per_md, $per_lg ), true )
			&& preg_match( '/--ed-vw:(\d+);--ed-vh:(\d+);/', $slides, $m ) && (int) $m[1] && (int) $m[2] ) {
			$style .= '--gs-first-r:' . round( (int) $m[1] / (int) $m[2], 4 ) . ';';
		}
		$slides = self::loading_hints( $slides, $attr, array( $per_sm, $per_md, $per_lg ) );
		if ( ! empty( $attr['linkToFile'] ) && empty( $attr['hasLg'] ) ) {
			$slides = self::file_links( $slides, $dom_id, $attr );
		}

		list( $prev_arrow, $next_arrow ) = self::arrows( $attr['arrowStyle'] );

		$wrapper = get_block_wrapper_attributes(
			array(
				'id'                   => $dom_id,
				'class'                => implode( ' ', array_filter( $classes ) ),
				// A carousel landmark (WAI-ARIA APG carousel pattern).
				'role'                 => 'region',
				'aria-roledescription' => __( 'carousel', 'gutenslider' ),
				'aria-label'           => __( 'Slider', 'gutenslider' ),
			)
		);

		$context = array(
			'settings' => $settings,
			'lightbox' => ! empty( $attr['hasLg'] ),
		);

		$directives = sprintf(
			' data-wp-interactive="gutenslider" data-wp-context="%1$s" data-wp-init="callbacks.init" data-hash="%2$s" data-settings="%3$s"',
			esc_attr( wp_json_encode( $context ) ),
			esc_attr( $attr['hashId'] ),
			esc_attr( wp_json_encode( $settings ) )
		);
		if ( ! empty( $attr['hasLg'] ) ) {
			$directives .= sprintf( ' data-lg-transition="%s"', esc_attr( $attr['lgTransition'] ) );
			self::lightbox_labels();
		}
		self::view_modules();

		$swiper = sprintf(
			'<div class="swiper"><div class="swiper-wrapper">%1$s</div></div>'
			. '<button type="button" class="eedee-gutenslider-nav eedee-gutenslider-prev" aria-label="%2$s">%3$s</button>'
			. '<button type="button" class="eedee-gutenslider-nav eedee-gutenslider-next" aria-label="%4$s">%5$s</button>'
			. '<div class="eedee-gutenslider-pagination"></div>',
			$slides,
			esc_attr__( 'Previous slide', 'gutenslider' ),
			$prev_arrow,
			esc_attr__( 'Next slide', 'gutenslider' ),
			$next_arrow
		);
		if ( ! empty( $attr['randomOrder'] ) ) {
			$swiper .= self::shuffle_script( $attr, $per_sm, $dom_id );
		}

		$dividers = $effect['dividers'] ? self::dividers( $attr ) : array( '', '' );

		if ( $is_fixed ) {
			$content_class = sprintf( 'wp-block-eedee-gutenslider__content co-%s', esc_attr( self::num( $attr['contentOpacity'], 1 ) ) );
			return sprintf(
				'<div %1$s style="%2$s"%3$s><div class="eedee-swiper-outer">%4$s%5$s<div class="%6$s">%7$s</div></div>%8$s</div>',
				$wrapper,
				esc_attr( $style ),
				$directives,
				$dividers[0],
				$swiper,
				$content_class,
				$fixed,
				$dividers[1]
			);
		}

		return sprintf(
			'<div %1$s%2$s><div class="eedee-swiper-outer" style="%3$s">%4$s%5$s%6$s</div></div>',
			$wrapper,
			$directives,
			esc_attr( $style ),
			$dividers[0],
			$swiper,
			$dividers[1]
		);
	}

	/**
	 * The block gap as [vertical, horizontal] CSS values (6.1 behavior: the
	 * theme's block gap unless the block sets its own).
	 *
	 * @param array $attr Slider attributes.
	 * @return string[]
	 */
	private static function block_gap( $attr ) {
		$fallback = 'var( --wp--style--gallery-gap-default, var( --gallery-block--gutter-size, var( --wp--style--block-gap, 0.5em ) ) )';
		$gap      = $attr['style']['spacing']['blockGap'] ?? null;
		$resolve  = static function ( $value ) use ( $fallback ) {
			if ( ! is_string( $value ) || '' === $value ) {
				return $fallback;
			}
			if ( 0 === strpos( $value, 'var:preset|spacing|' ) ) {
				return 'var(--wp--preset--spacing--' . _wp_to_kebab_case( substr( $value, strrpos( $value, '|' ) + 1 ) ) . ')';
			}
			$value = self::css( $value, $fallback );
			return '0' === $value ? '0px' : $value;
		};
		if ( is_array( $gap ) ) {
			return array( $resolve( $gap['top'] ?? null ), $resolve( $gap['left'] ?? null ) );
		}
		$value = $resolve( $gap );
		return array( $value, $value );
	}

	/**
	 * Settings for Swiper, in the shape 6.x printed into data-settings (the
	 * responsive keys are read by the view script, not by Swiper).
	 *
	 * @param array                 $attr   Slider attributes.
	 * @param array                 $effect The slider's effect (see effects()).
	 * @param string                $dom_id Element id.
	 * @param float|int|string      $per_lg Slides per view, desktop.
	 * @param float|int|string      $per_md Slides per view, tablet.
	 * @param float|int|string      $per_sm Slides per view, mobile.
	 * @return array
	 */
	private static function settings( $attr, $effect, $dom_id, $per_lg, $per_md, $per_sm ) {
		$space = static function ( $value ) use ( $effect ) {
			return $effect['gap'] ? (int) $value : 0;
		};
		$dividers = $attr['dividers'] ?? array();

		$settings = array(
			'autoplay'          => ! empty( $attr['autoplay'] ) ? array(
				'delay'                => (int) round( (float) $attr['duration'] * 1000 ),
				'pauseOnMouseEnter'    => (bool) $attr['pauseOnHover'],
				'disableOnInteraction' => ! $attr['pauseOnHover'],
			) : false,
			'speed'             => (int) round( (float) $attr['fadeSpeed'] * 1000 ),
			'direction'         => 'horizontal',
			'autoHeight'        => (bool) $attr['adaptiveHeightSm'],
			'loop'              => (bool) $attr['loop'],
			'centeredSlides'    => (bool) $attr['centeredSlides'] || $effect['centered'],
			'spaceBetween'      => $space( $attr['spaceBetweenSm'] ),
			'slidesPerView'     => $per_sm,
			'slidesPerGroup'    => max( 1, (int) $attr['slidesToScrollSm'] ),
			'effect'            => sanitize_key( $effect['base'] ? $effect['base'] : $attr['animation'] ),
			'fadeEffect'        => array( 'crossFade' => true ),
			'navigation'        => array(
				'nextEl' => '#' . $dom_id . ' .eedee-gutenslider-next',
				'prevEl' => '#' . $dom_id . ' .eedee-gutenslider-prev',
			),
			'pagination'        => array(
				'type'      => 'bullets',
				'clickable' => true,
				'el'        => '#' . $dom_id . ' .eedee-gutenslider-pagination',
			),
			'watchSlidesProgress' => true,
			'settingsMd'        => array(
				'autoHeight'     => (bool) $attr['adaptiveHeightMd'],
				'slidesPerView'  => $per_md,
				'slidesPerGroup' => max( 1, (int) $attr['slidesToScrollMd'] ),
				'spaceBetween'   => $space( $attr['spaceBetweenMd'] ),
				'loop'           => (bool) $attr['loop'],
			),
			'settingsLg'        => array(
				'autoHeight'     => (bool) $attr['adaptiveHeight'],
				'slidesPerView'  => $per_lg,
				'slidesPerGroup' => max( 1, (int) $attr['slidesToScroll'] ),
				'spaceBetween'   => $space( $attr['spaceBetween'] ),
				'loop'           => (bool) $attr['loop'],
			),
			'hasLg'             => (bool) $attr['hasLg'],
			'hasLgCounter'      => (bool) $attr['hasLgCounter'],
			'isFullScreen'      => (bool) $attr['isFullScreen'],
			'lgTitle'           => sanitize_key( $attr['lgTitle'] ),
			'lgCaption'         => sanitize_key( $attr['lgCaption'] ),
			'lgThumbnails'      => (bool) $attr['lgThumbnails'],
			'lgOpen'            => 'fade' === $attr['lgOpen'] ? 'fade' : 'zoom',
			'keyboard'          => ! empty( $attr['keyboardNavigation'] ) ? array(
				'enabled'        => true,
				'onlyInViewport' => true,
			) : false,
			'hashNavigation'    => ! empty( $attr['hashNavigation'] ) ? array(
				'replaceState' => true,
				'watchState'   => true,
			) : false,
			'dividers'          => ( $dividers['top']['value'] ?? 'none' ) !== 'none' || ( $dividers['bottom']['value'] ?? 'none' ) !== 'none',
			// Swiper's labels, translated: its English defaults would replace
			// the buttons' labels. The loop's own dots use the bullet one too.
			'a11y'              => array(
				'prevSlideMessage'        => __( 'Previous slide', 'gutenslider' ),
				'nextSlideMessage'        => __( 'Next slide', 'gutenslider' ),
				'firstSlideMessage'       => __( 'This is the first slide', 'gutenslider' ),
				'lastSlideMessage'        => __( 'This is the last slide', 'gutenslider' ),
				/* translators: %d: slide number */
				'paginationBulletMessage' => str_replace( '%d', '{{index}}', __( 'Go to slide %d', 'gutenslider' ) ),
			),
		);
		// Only when on: sliders without it keep the settings they had.
		if ( ! empty( $attr['randomOrder'] ) ) {
			$settings['randomOrder'] = true;
		}
		if ( '' !== (string) $effect['module'] ) {
			$module                = sanitize_key( $effect['module'] );
			$settings['modules'][] = $module;
			if ( $effect['motion'] ) {
				$settings['motionOnly'][] = $module;
			}
		}
		$settings = array_merge( $settings, (array) $effect['settings'] );
		/**
		 * The slider's settings for the view script (data-settings). A
		 * `modules` list names view modules to load for the slider, from the
		 * URLs of the `gutenslider_view_modules` filter.
		 *
		 * @param array $settings Settings.
		 * @param array $attr     Slider attributes.
		 * @param array $effect   The slider's effect (see effects()).
		 */
		return (array) apply_filters( 'gutenslider_slider_settings', $settings, $attr, $effect );
	}

	/**
	 * Previous/next arrow SVG (or text) for a style, falling back to the
	 * first style.
	 *
	 * @param string $style Arrow style value.
	 * @return string[] [prev, next]
	 */
	private static function arrows( $style ) {
		$arrows = gutenslider_arrows();
		$found  = $arrows[0];
		foreach ( $arrows as $arrow ) {
			if ( $arrow['value'] === $style ) {
				$found = $arrow;
				break;
			}
		}
		return array( self::svg( $found['prev'] ), self::svg( $found['next'] ) );
	}

	/**
	 * Trusted SVG artwork from includes/svg.php, run through KSES anyway
	 * because the arrows and dividers lists are filterable.
	 *
	 * @param string $svg SVG markup.
	 * @return string
	 */
	private static function svg( $svg ) {
		static $allowed = null;
		if ( null === $allowed ) {
			$common  = array( 'class' => true, 'style' => true, 'fill' => true, 'opacity' => true, 'transform' => true, 'id' => true, 'stroke' => true, 'stroke-width' => true, 'fill-rule' => true, 'clip-rule' => true, 'fill-opacity' => true );
			$allowed = array(
				'svg'      => $common + array( 'xmlns' => true, 'xmlns:xlink' => true, 'viewbox' => true, 'width' => true, 'height' => true, 'preserveaspectratio' => true, 'version' => true, 'x' => true, 'y' => true, 'xml:space' => true, 'aria-hidden' => true, 'focusable' => true ),
				'g'        => $common,
				'path'     => $common + array( 'd' => true ),
				'circle'   => $common + array( 'cx' => true, 'cy' => true, 'r' => true ),
				'ellipse'  => $common + array( 'cx' => true, 'cy' => true, 'rx' => true, 'ry' => true ),
				'rect'     => $common + array( 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'ry' => true ),
				'polygon'  => $common + array( 'points' => true ),
				'polyline' => $common + array( 'points' => true ),
				'line'     => $common + array( 'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true ),
				'defs'     => array(),
				'style'    => array(),
				'title'    => array(),
				'lineargradient' => $common + array( 'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'gradientunits' => true, 'gradienttransform' => true ),
				'stop'     => $common + array( 'offset' => true, 'stop-color' => true, 'stop-opacity' => true ),
				// The text arrow style.
				'span'     => array( 'class' => true ),
			);
		}
		$svg = wp_kses( $svg, $allowed );
		// Decorative: the buttons carry the label.
		return preg_replace( '/^<svg\b/', '<svg aria-hidden="true" focusable="false"', trim( $svg ), 1 );
	}

	/**
	 * Top and bottom divider markup.
	 *
	 * @param array $attr Slider attributes.
	 * @return string[] [top, bottom]
	 */
	private static function dividers( $attr ) {
		$out = array( '', '' );
		if ( empty( $attr['dividers'] ) ) {
			return $out;
		}
		$shapes = gutenslider_dividers();
		foreach ( array( 0 => 'top', 1 => 'bottom' ) as $i => $side ) {
			$d     = $attr['dividers'][ $side ] ?? array();
			$value = $d['value'] ?? 'none';
			if ( 'none' === $value || empty( $shapes[ $value ]['svg'] ) ) {
				continue;
			}
			$inverted = ! empty( $d['inverted'] ) && isset( $shapes[ $value ]['svg-inverted'] );
			$class    = 'gutenslider-divider-' . $side . ( $inverted ? ' inverted' : '' ) . ( ! empty( $d['flipY'] ) ? ' flip-y' : '' );
			$out[ $i ] = sprintf(
				'<div class="%1$s" style="color:%2$s" aria-hidden="true">%3$s</div>',
				esc_attr( $class ),
				esc_attr( self::css( $d['color'] ?? '', '#fff' ) ),
				self::svg( $inverted ? $shapes[ $value ]['svg-inverted'] : $shapes[ $value ]['svg'] )
			);
		}
		return $out;
	}

	/**
	 * Loading hints on the slide media: the first visible slide of the first
	 * slider (or of any slider with "first image not lazy") loads eagerly with
	 * high priority, the slides after it lazily. The view script switches the
	 * neighbours to eager before they slide in.
	 *
	 * The `sizes` follow the slides per view of each breakpoint, so a
	 * three-up carousel does not download full-width files. A "cover" image
	 * is drawn wider than its slide when the slide is relatively taller (a
	 * landscape photo on a phone): see cover_sizes(). The view script sets a
	 * cover image that has not loaded yet to the width it is drawn at.
	 *
	 * @param string $slides   Rendered slides.
	 * @param array  $attr     Slider attributes.
	 * @param array  $per_view Slides per view: mobile, tablet, desktop.
	 * @return string
	 */
	private static function loading_hints( $slides, $attr, $per_view ) {
		list( $per_sm, $per_md, $per_lg ) = $per_view;
		// Random order: the script after the slides picks the eager ones.
		$eager_first = empty( $attr['randomOrder'] ) && self::eager_first( $attr );
		$visible     = self::visible( $per_sm );
		$width       = static function ( $per ) {
			return 'auto' === $per || (float) $per <= 1 ? '100vw' : sprintf( 'calc(100vw / %s)', round( (float) $per, 2 ) );
		};
		$sizes       = sprintf( '(max-width: 600px) %1$s, (max-width: 960px) %2$s, %3$s', $width( $per_sm ), $width( $per_md ), $width( $per_lg ) );
		$tags        = new \WP_HTML_Tag_Processor( $slides );
		$slide       = -1;
		$media_seen  = array();
		while ( $tags->next_tag() ) {
			$tag = $tags->get_tag();
			if ( 'DIV' === $tag && $tags->has_class( 'swiper-slide' ) ) {
				++$slide;
				continue;
			}
			if ( 'IMG' !== $tag || ! $tags->has_class( 'gs-slide-media' ) || isset( $media_seen[ $slide ] ) ) {
				continue;
			}
			$media_seen[ $slide ] = true;
			$eager                = $slide < $visible && $eager_first;
			$tags->set_attribute( 'loading', $eager ? 'eager' : 'lazy' );
			if ( $eager && 0 === $slide ) {
				$tags->set_attribute( 'fetchpriority', 'high' );
			}
			if ( null !== $tags->get_attribute( 'srcset' ) ) {
				$cover = self::cover_sizes( $tags, $attr, $per_view );
				// `auto` lets lazy images use their laid-out width, which is
				// the box, not the drawn width of a cover image.
				$tags->set_attribute( 'sizes', $cover ? $cover : ( $eager ? '' : 'auto, ' ) . $sizes );
			}
		}
		return $tags->get_updated_html();
	}

	/**
	 * `sizes` for a "cover" image: per breakpoint the wider of the slide's
	 * width and the slider's height times the image's ratio. Only where the
	 * image fills the slider's height: not with adaptive height (that
	 * breakpoint keeps the width) or the blocks below or above the image.
	 * Empty when nothing changes or a height is no plain length.
	 *
	 * @param \WP_HTML_Tag_Processor $tags     At the image.
	 * @param array                  $attr     Slider attributes.
	 * @param array                  $per_view Slides per view: mobile, tablet, desktop.
	 * @return string
	 */
	private static function cover_sizes( $tags, $attr, $per_view ) {
		$w = (int) $tags->get_attribute( 'width' );
		$h = (int) $tags->get_attribute( 'height' );
		if ( ! $w || ! $h || ! preg_match( '/object-fit:\s*cover/', (string) $tags->get_attribute( 'style' ) )
			|| in_array( $attr['contentPlacement'] ?? '', array( 'below', 'above' ), true ) ) {
			return '';
		}
		$bands = array(
			array( '(max-width: 600px) ', $per_view[0], 'sliderHeightSm', 'adaptiveHeightSm' ),
			array( '(max-width: 960px) ', $per_view[1], 'sliderHeightMd', 'adaptiveHeightMd' ),
			array( '', $per_view[2], 'sliderHeight', 'adaptiveHeight' ),
		);
		$out     = array();
		$changed = false;
		foreach ( $bands as list( $query, $per, $height_key, $adaptive_key ) ) {
			// Auto width: the slide already has the image's ratio.
			$width = 'auto' === $per || (float) $per <= 1 ? '100vw' : sprintf( 'calc(100vw / %s)', round( (float) $per, 2 ) );
			$height = ! empty( $attr['isFullScreen'] ) ? '100vh' : self::css( $attr[ $height_key ] ?? '', '50vh' );
			if ( 'auto' !== $per && empty( $attr[ $adaptive_key ] ) ) {
				if ( ! preg_match( '/^\d+(\.\d+)?(px|vh|svh|lvh|dvh|vw|rem|em)$/', $height ) ) {
					return '';
				}
				$width   = sprintf( 'max(%1$s, calc(%2$s * %3$s))', $width, $height, round( $w / $h, 4 ) );
				$changed = true;
			}
			$out[] = $query . $width;
		}
		return $changed ? implode( ', ', $out ) : '';
	}

	/**
	 * Takes the `auto` WordPress puts before a lazy image's `sizes` (in
	 * wp_filter_content_tags()) off a slide's "cover" image again: `auto` is
	 * the box's width, not the drawn width cover_sizes() asks for.
	 *
	 * @param string $image An image tag from the content.
	 * @return string
	 */
	public static function cover_img_tag( $image ) {
		if ( false === strpos( $image, 'gs-slide-media' ) ) {
			return $image;
		}
		$tags = new \WP_HTML_Tag_Processor( $image );
		if ( $tags->next_tag( array( 'tag_name' => 'IMG', 'class_name' => 'gs-slide-media' ) ) ) {
			$sizes = (string) $tags->get_attribute( 'sizes' );
			if ( preg_match( '/^auto\s*,\s*(.*\bmax\(.*)$/', $sizes, $m ) ) {
				$tags->set_attribute( 'sizes', $m[1] );
				return $tags->get_updated_html();
			}
		}
		return $image;
	}

	/**
	 * Attributes on the slides' links to their image files (see slide()), so
	 * a lightbox plugin shows each slider as one gallery. Filterable:
	 * `gutenslider_file_link_attributes` gets the attributes, the slider's
	 * element id and its attributes.
	 *
	 * @param string $slides Rendered slides.
	 * @param string $dom_id Slider element id.
	 * @param array  $attr   Slider attributes.
	 * @return string
	 */
	private static function file_links( $slides, $dom_id, $attr ) {
		$attributes = apply_filters( 'gutenslider_file_link_attributes', array( 'data-gs-gallery' => $dom_id ), $dom_id, $attr );
		if ( ! is_array( $attributes ) || ! $attributes ) {
			return $slides;
		}
		$tags = new \WP_HTML_Tag_Processor( $slides );
		while ( $tags->next_tag( array( 'tag_name' => 'A', 'class_name' => 'gs-file-link' ) ) ) {
			foreach ( $attributes as $name => $value ) {
				// The tag processor escapes the value.
				if ( is_string( $name ) && preg_match( '/^[a-z][a-z0-9_-]*$/i', $name ) && is_scalar( $value ) && false !== $value ) {
					$tags->set_attribute( $name, true === $value ? true : (string) $value );
				}
			}
		}
		return $tags->get_updated_html();
	}

	/**
	 * Whether the slider's first image loads eagerly with high priority: in
	 * the first slider of the page, or with "first image not lazy".
	 *
	 * @param array $attr Slider attributes.
	 * @return bool
	 */
	private static function eager_first( $attr ) {
		return 1 === self::$sliders || ! empty( $attr['firstNotLazy'] );
	}

	/**
	 * How many slides are on screen at first (mobile's slides per view).
	 *
	 * @param float|int|string $per_sm Slides per view, mobile.
	 * @return int
	 */
	private static function visible( $per_sm ) {
		return 'auto' === $per_sm ? 2 : (int) ceil( (float) $per_sm );
	}

	/**
	 * "Random order": a small script right after the slides shuffles them
	 * while the page is parsed, before the first paint and before Swiper,
	 * so each visit gets its order, cached pages too, and the first slide
	 * on screen is never swapped. It makes the new first slides' images
	 * eager (the server marked none). Each slide keeps its old place in
	 * data-gs-pos: numbered hash names stay with their slide. mount.js
	 * shuffles too if this did not run (the editor's Preview). No "&" in
	 * it: the post content filters would turn it into "&#038;".
	 *
	 * Optimizers that combine and defer inline scripts (LiteSpeed Cache)
	 * move it to the footer, where currentScript is the combined file: it
	 * then finds the slider by its id, and leaves it alone if mount.js
	 * shuffled it already.
	 *
	 * @param array            $attr   Slider attributes.
	 * @param float|int|string $per_sm Slides per view, mobile.
	 * @param string           $dom_id Slider element id.
	 * @return string
	 */
	private static function shuffle_script( $attr, $per_sm, $dom_id ) {
		$js = sprintf(
			'(function(c,v,p){var s=(c?c.closest(".wp-block-eedee-block-gutenslider"):null)||document.getElementById(%3$s);'
			. 'if(!s||s.hasAttribute("data-gs-shuffled"))return;'
			. 'var w=s.querySelector(".swiper-wrapper"),a=[].slice.call(w.children),i,j,t;'
			. 'a.forEach(function(e,n){e.setAttribute("data-gs-pos",n)});'
			. 'for(i=a.length-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=a[i];a[i]=a[j];a[j]=t}'
			. 'a.forEach(function(e,n){var m=n<v?e.querySelector("img.gs-slide-media"):null;'
			. 'if(m){m.sizes=m.sizes.replace(/^auto,\\s*/,"");m.loading="eager";if(p>n)m.fetchPriority="high"}w.appendChild(e)});'
			. 's.setAttribute("data-gs-shuffled","")})(document.currentScript,%1$d,%2$d);',
			self::visible( $per_sm ),
			self::eager_first( $attr ) ? 1 : 0,
			wp_json_encode( $dom_id )
		);
		return wp_get_inline_script_tag( $js );
	}

	/**
	 * The slide block.
	 *
	 * @param array     $attributes Block attributes.
	 * @param string    $content    Rendered inner blocks.
	 * @param \WP_Block $block      Block instance.
	 * @return string
	 */
	public static function slide( $attributes, $content, $block ) {
		$attr = self::with_defaults( $attributes, 'eedee/block-gutenslide' );
		if ( ! empty( $attr['isHidden'] ) ) {
			return '';
		}
		$context = $block instanceof \WP_Block ? $block->context : array();

		$bg   = is_array( $attr['background'] ) ? $attr['background'] : array();
		$type = isset( $bg['backgroundType'] ) ? (string) $bg['backgroundType'] : 'color';
		$bg  += array(
			'backgroundColor'                  => '#fffa',
			'backgroundGradient'               => '',
			'backgroundImage'                  => array(),
			'backgroundFocalPoint'             => array( 'x' => 0.5, 'y' => 0.5 ),
			'backgroundVideoFocalPoint'        => array( 'x' => 0.5, 'y' => 0.5 ),
			'backgroundImageSize'              => 'cover',
			'backgroundVideoSize'              => 'cover',
			'backgroundVideo'                  => array(),
			'backgroundVideoLoop'              => true,
			'backgroundVideoPauseWhenInactive' => true,
			'backgroundVideoMuted'             => true,
			'backgroundOverlayImage'           => '',
			'backgroundOverlayVideo'           => '',
			'backgroundOverlayOpacity'         => 50,
		);
		$image = is_array( $bg['backgroundImage'] ) ? $bg['backgroundImage'] : array();
		$video = is_array( $bg['backgroundVideo'] ) ? $bg['backgroundVideo'] : array();
		// Video autoplay: the slide's own setting, else the slider's.
		if ( ! isset( $bg['backgroundVideoAutoplay'] ) || ! is_bool( $bg['backgroundVideoAutoplay'] ) ) {
			$bg['backgroundVideoAutoplay'] = false !== ( $context['gutenslider/videoAutoplay'] ?? true );
		}

		$classes = array( 'swiper-slide', 'wp-block-eedee-block-gutenslide' );
		if ( ! empty( $attr['className'] ) ) {
			$classes[] = $attr['className'];
		}
		if ( isset( self::POSITIONS[ $attr['contentPosition'] ] ) ) {
			$classes[] = self::POSITIONS[ $attr['contentPosition'] ];
		}
		$type_classes = array(
			'image'    => 'ed-bg-image',
			'none'     => 'ed-bg-none',
			'video'    => 'ed-bg-video',
			'gradient' => 'ed-bg-gradient',
			'color'    => 'ed-bg-color',
		);
		if ( isset( $type_classes[ $type ] ) ) {
			$classes[] = $type_classes[ $type ];
		}
		if ( 'video' === $type && ! empty( $video['embed'] ) ) {
			$classes[] = 'ed-bg-video-embed';
		}

		$style = '';
		if ( in_array( $type, array( 'color', 'gradient', 'none' ), true ) && ! empty( $attr['minWidth'] ) ) {
			$style .= '--slide-min-width:' . self::css( $attr['minWidth'], '80%' ) . ';';
		}

		// Overlay: a color or gradient over media, or the slide's own color/gradient.
		$overlay_kind = '';
		if ( 'color' === $type || 'color' === $bg['backgroundOverlayImage'] || 'color' === $bg['backgroundOverlayVideo'] ) {
			$overlay_kind = 'color';
		} elseif ( 'gradient' === $type || 'gradient' === $bg['backgroundOverlayImage'] || 'gradient' === $bg['backgroundOverlayVideo'] ) {
			$overlay_kind = 'gradient';
		}
		$overlay_value = '';
		if ( 'color' === $overlay_kind ) {
			$overlay_value = self::css( $bg['backgroundColor'] );
		} elseif ( 'gradient' === $overlay_kind && is_string( $bg['backgroundGradient'] ) ) {
			$overlay_value = self::css( $bg['backgroundGradient'] );
		}
		$overlaid_media = in_array( $bg['backgroundOverlayImage'], array( 'color', 'gradient' ), true )
			|| in_array( $bg['backgroundOverlayVideo'], array( 'color', 'gradient' ), true );
		$opacity        = $overlaid_media ? max( 0, min( 100, (float) $bg['backgroundOverlayOpacity'] ) ) / 100 : 1;
		$overlay_style  = 'opacity:' . $opacity . ';' . ( '' !== $overlay_value ? 'background:' . $overlay_value . ';' : '' );

		$media      = '';
		$file       = null;
		$bg_classes = array( 'eedee-background-div' );
		$has_media  = in_array( $type, array( 'image', 'video' ), true );
		if ( ! $has_media ) {
			$bg_classes[] = 'no-media-background';
		}

		$shows_image = 'image' === $type
			|| ( 'color' === $type && 'color' === $bg['backgroundOverlayImage'] )
			|| ( 'gradient' === $type && 'gradient' === $bg['backgroundOverlayImage'] );
		$shows_video = 'video' === $type
			|| ( 'color' === $type && 'color' === $bg['backgroundOverlayVideo'] )
			|| ( 'gradient' === $type && 'gradient' === $bg['backgroundOverlayVideo'] );

		$embed = $shows_video ? Embed::of( $video ) : null;
		// A video from a platform with no player here shows its poster.
		$no_player = $shows_video && ! $embed && ! in_array( (string) ( $video['provider'] ?? '' ), array( '', 'file' ), true );
		if ( $embed ) {
			$bg_classes[] = 'bg-video';
			$classes[]    = 'ed-bg-embed';
			$classes[]    = 'ed-bg-' . $embed['provider'];
			$poster       = '';
			$w            = (int) ( $video['width'] ?? 1920 );
			$h            = (int) ( $video['height'] ?? 1080 );
			if ( ! empty( $image['url'] ) ) {
				// The poster fills the player's box, which has the video's ratio.
				list( $poster ) = self::image( $image, array_merge( $bg, array( 'backgroundImageSize' => 'cover' ) ), $attr );
			}
			$media  = Embed::markup( $embed, $video, $bg, $poster );
			$style .= sprintf( '--ed-vw:%d;--ed-vh:%d;', $w, $h );
		} elseif ( ( $shows_image || $no_player ) && ! empty( $image['url'] ) ) {
			$bg_classes[] = 'bg-image';
			$file         = $image;
			list( $media, $w, $h ) = self::image( $image, $bg, $attr );
			$style .= sprintf( '--ed-vw:%d;--ed-vh:%d;', $w, $h );
		} elseif ( $shows_video && ! $no_player && ! empty( $video['url'] ) ) {
			$bg_classes[] = 'bg-video';
			$media        = self::video( $video, $bg, $image );
			$style       .= sprintf( '--ed-vw:%d;--ed-vh:%d;', (int) ( $video['width'] ?? 0 ), (int) ( $video['height'] ?? 0 ) );
		}

		$background = sprintf(
			'<div class="%1$s">%2$s<div class="eedee-background-div__overlay" style="%3$s"></div></div>',
			esc_attr( implode( ' ', $bg_classes ) ),
			$media,
			esc_attr( $overlay_style )
		);

		$link = '';
		if ( ! empty( $attr['linkUrl'] ) ) {
			$link = sprintf(
				'<a class="slide-link" href="%1$s"%2$s><span class="screen-reader-text">%3$s</span></a>',
				esc_url( $attr['linkUrl'] ),
				! empty( $attr['opensInNewTab'] ) ? ' target="_blank" rel="noreferrer noopener"' : '',
				esc_html__( 'Open link', 'gutenslider' )
			);
		} elseif ( $file && ! empty( $context['gutenslider/linkToFile'] ) && empty( $context['gutenslider/hasLg'] ) ) {
			// "Link images to the file": for lightbox plugins that open
			// linked images. The slider's own lightbox wins when it is on.
			$id   = isset( $file['id'] ) ? (int) $file['id'] : 0;
			$href = $id ? wp_get_attachment_url( $id ) : '';
			$link = sprintf(
				'<a class="slide-link gs-file-link" href="%1$s" data-gs-file><span class="screen-reader-text">%2$s</span></a>',
				esc_url( $href ? $href : $file['url'] ),
				esc_html__( 'Open image', 'gutenslider' )
			);
		}

		if ( ! empty( $context['gutenslider/hasLg'] ) && false !== strpos( $content, 'wp-image-' ) ) {
			$content = self::inner_media_texts( $content );
		}

		return sprintf(
			'<div class="%1$s"%2$s data-hash="%3$s" role="group" aria-roledescription="%4$s">%5$s<div class="slide-content">%6$s</div>%7$s</div>',
			esc_attr( implode( ' ', $classes ) ),
			$style ? ' style="' . esc_attr( $style ) . '"' : '',
			esc_attr( $attr['hashId'] ),
			esc_attr_x( 'slide', 'ARIA role description', 'gutenslider' ),
			$background,
			$content,
			$link
		);
	}

	/**
	 * Background image with srcset from the Media Library; the saved URL is
	 * the fallback for images that are not attachments (e.g. from a URL).
	 *
	 * @param array $image Saved image object.
	 * @param array $bg    Background settings.
	 * @param array $attr  Slide attributes.
	 * @return array [markup, width, height]
	 */
	private static function image( $image, $bg, $attr ) {
		$id    = isset( $image['id'] ) ? (int) $image['id'] : 0;
		$fp    = is_array( $bg['backgroundFocalPoint'] ) ? $bg['backgroundFocalPoint'] : array();
		$style = sprintf(
			'object-fit:%1$s;object-position:%2$s%% %3$s%%;',
			in_array( $bg['backgroundImageSize'], array( 'cover', 'contain', 'fill', 'none', 'scale-down' ), true ) ? $bg['backgroundImageSize'] : 'cover',
			round( (float) ( $fp['x'] ?? 0.5 ) * 100, 2 ),
			round( (float) ( $fp['y'] ?? 0.5 ) * 100, 2 )
		);
		$post  = $id ? get_post( $id ) : null;
		$data  = self::media_texts( $post );

		$alt = isset( $image['alt'] ) ? (string) $image['alt'] : '';
		if ( $post && wp_attachment_is_image( $id ) ) {
			$full = wp_get_attachment_image_src( $id, 'full' );
			$html = wp_get_attachment_image(
				$id,
				'full',
				false,
				array_merge(
					array(
						'class'    => 'wp-image-' . $id . ' gs-slide-media',
						'alt'      => $alt,
						'style'    => $style,
						'sizes'    => '100vw',
						'decoding' => 'async',
						// Final value set by the slider (see loading_hints()).
						'loading'  => 'lazy',
					),
					$data
				)
			);
			return array( $html, (int) ( $full[1] ?? 0 ), (int) ( $full[2] ?? 0 ) );
		}

		$w = (int) ( $image['width'] ?? 0 );
		$h = (int) ( $image['height'] ?? 0 );
		$attrs = '';
		foreach ( $data as $key => $value ) {
			$attrs .= sprintf( ' %s="%s"', $key, esc_attr( $value ) );
		}
		$html = sprintf(
			'<img class="%1$s" src="%2$s" alt="%3$s"%4$s decoding="async" loading="lazy" style="%5$s"%6$s>',
			esc_attr( trim( ( $id ? 'wp-image-' . $id : '' ) . ' gs-slide-media' ) ),
			esc_url( $image['url'] ),
			esc_attr( $alt ),
			$w && $h ? sprintf( ' width="%d" height="%d"', $w, $h ) : '',
			esc_attr( $style ),
			$attrs
		);
		return array( $html, $w, $h );
	}

	/**
	 * The Media Library texts of an attachment, as data attributes for the
	 * lightbox's heading and text.
	 *
	 * @param \WP_Post|null $post Attachment.
	 * @return array<string, string>
	 */
	private static function media_texts( $post ) {
		$data = array();
		if ( $post && 'attachment' === $post->post_type ) {
			foreach ( array( 'caption' => $post->post_excerpt, 'title' => $post->post_title, 'description' => $post->post_content ) as $key => $value ) {
				if ( '' !== $value ) {
					$data[ 'data-' . $key ] = wp_strip_all_tags( $value );
				}
			}
		}
		return $data;
	}

	/**
	 * Image blocks on a slide get the same texts as background images, so the
	 * lightbox can show them (only for sliders with the lightbox on).
	 *
	 * @param string $content Rendered blocks of the slide.
	 * @return string
	 */
	private static function inner_media_texts( $content ) {
		$tags = new \WP_HTML_Tag_Processor( $content );
		while ( $tags->next_tag( 'IMG' ) ) {
			if ( null !== $tags->get_attribute( 'data-caption' ) || ! preg_match( '/\bwp-image-(\d+)\b/', (string) $tags->get_attribute( 'class' ), $m ) ) {
				continue;
			}
			foreach ( self::media_texts( get_post( (int) $m[1] ) ) as $name => $value ) {
				$tags->set_attribute( $name, $value );
			}
		}
		return $tags->get_updated_html();
	}

	/**
	 * Tells the view script where the view modules are.
	 */
	private static function view_modules() {
		$modules = self::view_module_urls();
		if ( $modules ) {
			wp_interactivity_config( 'gutenslider', array( 'modules' => $modules ) );
		}
	}

	/**
	 * Script modules another plugin adds to the view script, by name (see
	 * the `modules` setting). Only files of this site's plugins and themes.
	 *
	 * @return array<string, string> Module URLs.
	 */
	public static function view_module_urls() {
		$modules = apply_filters( 'gutenslider_view_modules', array() );
		$out     = array();
		$roots   = array( plugins_url( '/' ), content_url( '/' ) );
		foreach ( is_array( $modules ) ? $modules : array() as $name => $url ) {
			if ( ! is_string( $name ) || ! is_string( $url ) ) {
				continue;
			}
			foreach ( $roots as $root ) {
				if ( 0 === strpos( $url, $root ) ) {
					$out[ sanitize_key( $name ) ] = esc_url_raw( $url );
					break;
				}
			}
		}
		return $out;
	}

	/**
	 * The lightbox's texts, translated, for the view script (once per page).
	 */
	private static function lightbox_labels() {
		wp_interactivity_config(
			'gutenslider',
			array(
				'labels' => array(
					'viewer'  => __( 'Image viewer', 'gutenslider' ),
					'close'   => __( 'Close', 'gutenslider' ),
					'prev'    => __( 'Previous image', 'gutenslider' ),
					'next'    => __( 'Next image', 'gutenslider' ),
					/* translators: %d: image number in the lightbox */
					'show'    => __( 'Show image %d', 'gutenslider' ),
				),
			)
		);
	}

	/**
	 * Background video. The first slide's video starts at once; the view
	 * script starts and pauses the others as slides become active.
	 *
	 * @param array $video Saved video object.
	 * @param array $bg    Background settings.
	 * @param array $image Saved poster image object.
	 * @return string
	 */
	private static function video( $video, $bg, $image ) {
		$fp    = is_array( $bg['backgroundVideoFocalPoint'] ) ? $bg['backgroundVideoFocalPoint'] : array();
		$w     = (int) ( $video['width'] ?? 0 );
		$h     = (int) ( $video['height'] ?? 0 );
		$style = sprintf(
			'object-fit:%1$s;object-position:%2$s%% %3$s%%;--ed-vw:%4$dpx;--ed-vh:%5$dpx;',
			in_array( $bg['backgroundVideoSize'], array( 'cover', 'contain', 'fill', 'none', 'scale-down' ), true ) ? $bg['backgroundVideoSize'] : 'cover',
			round( (float) ( $fp['x'] ?? 0.5 ) * 100, 2 ),
			round( (float) ( $fp['y'] ?? 0.5 ) * 100, 2 ),
			$w,
			$h
		);
		$mime = isset( $video['mime'] ) && preg_match( '#^video/[a-z0-9.+-]+$#i', $video['mime'] ) ? $video['mime'] : 'video/mp4';
		return sprintf(
			'<video class="gs-slide-media%1$s" src="%2$s" type="%3$s"%9$s playsinline preload="metadata"%4$s%5$s%6$s style="%7$s"%8$s></video>',
			$bg['backgroundVideoPauseWhenInactive'] ? ' bg-video-autopause' : '',
			esc_url( $video['url'] ),
			esc_attr( $mime ),
			$bg['backgroundVideoLoop'] ? ' loop' : '',
			$bg['backgroundVideoMuted'] ? ' muted' : '',
			! empty( $image['url'] ) ? ' poster="' . esc_url( $image['url'] ) . '"' : '',
			esc_attr( $style ),
			$w && $h ? sprintf( ' width="%d" height="%d"', $w, $h ) : '',
			// Without autoplay the visitor starts it: the browser's controls.
			$bg['backgroundVideoAutoplay'] ? ' autoplay' : ' controls'
		);
	}
}
