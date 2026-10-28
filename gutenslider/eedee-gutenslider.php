<?php

/**
 * Plugin Name:       Gutenslider — Slider Block for the Block Editor
 * Plugin URI:        https://gutenslider.org
 * Description:       A slider block for images, videos and any blocks on top: carousels, hero sliders and fullscreen background sliders, with responsive settings.
 * Version:           7.3.4
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            eedee
 * Author URI:        https://eedee.net
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       gutenslider
 * Domain Path:       /languages
 *
 *
 * @package Gutenslider
 */
if ( !defined( 'ABSPATH' ) ) {
    exit;
}
// The free and the Pro plugin are both active: Freemius hands over to one.
if ( function_exists( 'gutenslider_fs' ) ) {
    gutenslider_fs()->set_basename( false, __FILE__ );
    return;
}
define( 'GUTENSLIDER_VERSION', '7.3.4' );
define( 'GUTENSLIDER_PLUGIN_FILE', __FILE__ );
define( 'GUTENSLIDER_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'GUTENSLIDER_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'GUTENSLIDER_PLUGIN_BASE', plugin_basename( __FILE__ ) );
// 6.x constants some sites' code may read.
define( 'GUTENSLIDER_PLUGIN_NAME', 'Gutenslider' );
define( 'GUTENSLIDER_PLUGIN_SLUG', 'gutenslider' );
require_once __DIR__ . '/includes/freemius.php';
require_once __DIR__ . '/includes/svg.php';
require_once __DIR__ . '/includes/class-render.php';
require_once __DIR__ . '/includes/class-plugin.php';
require_once __DIR__ . '/includes/class-embed.php';
require_once __DIR__ . '/includes/video-sources/class-video-source.php';
require_once __DIR__ . '/includes/video-sources/class-youtube-source.php';
require_once __DIR__ . '/includes/video-sources/class-file-source.php';
require_once __DIR__ . '/includes/video-sources/class-video-sources.php';
Gutenslider\Plugin::init();
Gutenslider\Video_Sources::init();