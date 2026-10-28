<?php
/**
 * Block registration, assets, patterns and translations.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Wires the plugin into WordPress.
 */
final class Plugin {

	const BLOCKS = array( 'slider', 'slide' );

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_blocks' ) );
		add_action( 'init', array( __CLASS__, 'register_patterns' ) );
		add_filter( 'block_type_metadata', array( __CLASS__, 'legacy_attribute_filters' ) );
		add_action( 'enqueue_block_editor_assets', array( __CLASS__, 'editor_data' ) );
		add_filter( 'plugin_row_meta', array( __CLASS__, 'row_meta' ), 10, 2 );
		add_filter( 'gutenslider_file_link_attributes', array( __CLASS__, 'photoswipe_gallery' ), 10, 2 );
		add_filter( 'wp_content_img_tag', array( Render::class, 'cover_img_tag' ) );
	}

	/**
	 * Absolute path of a file in build/.
	 *
	 * @param string $path Relative path.
	 * @return string
	 */
	public static function build_path( $path ) {
		return plugin_dir_path( GUTENSLIDER_PLUGIN_FILE ) . 'build/' . $path;
	}

	/**
	 * Registers both blocks from their block.json.
	 */
	public static function register_blocks() {
		foreach ( self::BLOCKS as $block ) {
			register_block_type( self::build_path( 'blocks/' . $block ) );
		}
		// Lets WordPress inline the small front-end stylesheet instead of a request.
		$style = generate_block_asset_handle( 'eedee/block-gutenslider', 'style' );
		wp_style_add_data( $style, 'path', self::build_path( 'blocks/slider/style-index.css' ) );
	}

	/**
	 * The `gutenslider_attributes` / `gutenslide_attributes` filters from 6.x,
	 * so code that added attributes keeps working.
	 *
	 * @param array $metadata Block metadata.
	 * @return array
	 */
	public static function legacy_attribute_filters( $metadata ) {
		$filters = array(
			'eedee/block-gutenslider' => 'gutenslider_attributes',
			'eedee/block-gutenslide'  => 'gutenslide_attributes',
		);
		if ( isset( $metadata['name'], $filters[ $metadata['name'] ] ) && isset( $metadata['attributes'] ) ) {
			// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound -- One of the two prefixed 6.x names above.
			$metadata['attributes'] = apply_filters( $filters[ $metadata['name'] ], $metadata['attributes'] );
		}
		return $metadata;
	}

	/**
	 * Arrow and divider artwork for the editor (window.eedeeGutenslider, as in 6.x).
	 */
	public static function editor_data() {
		$handle = generate_block_asset_handle( 'eedee/block-gutenslider', 'editorScript' );
		$data   = array(
			'siteUrl'             => get_site_url(),
			'pluginsUrl'          => plugins_url( '/', GUTENSLIDER_PLUGIN_FILE ),
			'arrows'              => gutenslider_arrows(),
			'gutensliderDividers' => gutenslider_dividers(),
			// The effects and view modules, for the canvas and the Preview
			// (see Render::effects() and Render::view_module_urls()).
			'effects'             => (object) Render::effects(),
			'modules'             => (object) Render::view_module_urls(),
			// Video ids by provider (Embed::providers()), as the source and
			// the flags of a JavaScript pattern.
			'providers'           => (object) array_filter( array_map( array( __CLASS__, 'js_pattern' ), Embed::providers() ) ),
		);
		wp_add_inline_script( $handle, 'window.eedeeGutenslider = ' . wp_json_encode( $data ) . ';', 'before' );
		wp_set_script_translations( $handle, 'gutenslider' );
	}

	/**
	 * A PHP regular expression as [ source, flags ] for JavaScript, or null
	 * when it isn't delimited. Flags JavaScript doesn't share are dropped.
	 *
	 * @param string $pattern Regular expression.
	 * @return array|null
	 */
	public static function js_pattern( $pattern ) {
		$pattern   = (string) $pattern;
		$delimiter = substr( $pattern, 0, 1 );
		$end       = strrpos( $pattern, $delimiter );
		if ( '' === $delimiter || ctype_alnum( $delimiter ) || '\\' === $delimiter || ! $end ) {
			return null;
		}
		return array(
			substr( $pattern, 1, $end - 1 ),
			implode( '', array_intersect( str_split( substr( $pattern, $end + 1 ) . ' ' ), array( 'i', 'm', 's', 'u' ) ) ),
		);
	}

	/**
	 * Block patterns from patterns/*.php.
	 */
	public static function register_patterns() {
		register_block_pattern_category(
			'gutenslider',
			array( 'label' => __( 'Sliders', 'gutenslider' ) )
		);
		foreach ( glob( plugin_dir_path( GUTENSLIDER_PLUGIN_FILE ) . 'patterns/*.php' ) as $file ) {
			$pattern = require $file;
			if ( is_array( $pattern ) && isset( $pattern['name'] ) ) {
				$name = $pattern['name'];
				unset( $pattern['name'] );
				register_block_pattern( $name, $pattern );
			}
		}
	}

	/**
	 * Lightbox with PhotoSwipe shows all linked images of a page as one
	 * gallery, except those with a gallery id: one gallery per slider.
	 *
	 * @param array  $attributes Attributes of the slides' file links.
	 * @param string $dom_id     Slider element id.
	 * @return array
	 */
	public static function photoswipe_gallery( $attributes, $dom_id ) {
		if ( is_array( $attributes ) && class_exists( 'LightboxPhotoSwipe\LightboxPhotoSwipe', false ) ) {
			$attributes['data-lbwps-gid'] = $dom_id;
		}
		return $attributes;
	}

	/**
	 * Documentation link on the Plugins screen.
	 *
	 * @param string[] $meta Row meta links.
	 * @param string   $file Plugin file.
	 * @return string[]
	 */
	public static function row_meta( $meta, $file ) {
		if ( plugin_basename( GUTENSLIDER_PLUGIN_FILE ) === $file ) {
			$meta[] = sprintf(
				'<a href="%1$s">%2$s</a>',
				esc_url( 'https://gutenslider.org/examples/' ),
				esc_html__( 'Documentation', 'gutenslider' )
			);
		}
		return $meta;
	}
}
