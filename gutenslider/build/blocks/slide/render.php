<?php
/**
 * Server render for the slide block; see includes/class-render.php.
 *
 * @package Gutenslider
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in Render.
echo Gutenslider\Render::slide( $attributes, $content, $block );
