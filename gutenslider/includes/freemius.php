<?php

/**
 * Freemius SDK: licensing and checkout for Gutenslider Pro, and nothing else.
 *
 * Quiet by design and in wordpress.org compliance mode: anonymous mode (no
 * opt-in screen, no activation redirect, nothing sent unless an admin opts
 * in), no trial, affiliate or Customizer promotions, no deactivation survey,
 * and no Freemius pages in the admin menu. Loaded through Composer
 * (vendor/freemius/wordpress-sdk), which also resolves the newest SDK when
 * several plugins bundle it.
 *
 * Kept outside the namespace: Freemius expects a global accessor, and 6.x
 * code (and sites) call gutenslider_fs().
 *
 * @package Gutenslider
 */
defined( 'ABSPATH' ) || exit;
/**
 * The plugin's Freemius instance.
 *
 * @return Freemius
 */
function gutenslider_fs() {
    global $gutenslider_fs;
    if ( !isset( $gutenslider_fs ) ) {
        if ( !defined( 'WP_FS__PRODUCT_3804_MULTISITE' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- Freemius reads this exact name.
            define( 'WP_FS__PRODUCT_3804_MULTISITE', true );
        }
        require_once dirname( __DIR__ ) . '/vendor/freemius/wordpress-sdk/start.php';
        $gutenslider_fs = fs_dynamic_init( array(
            'id'               => '3804',
            'slug'             => 'gutenslider',
            'premium_slug'     => 'gutenslider-premium',
            'type'             => 'plugin',
            'public_key'       => 'pk_b1382b7052729d6937e614cebce0a',
            'is_premium'       => false,
            'premium_suffix'   => 'Pro',
            'has_addons'       => false,
            'has_paid_plans'   => true,
            'has_affiliation'  => false,
            'is_org_compliant' => true,
            'anonymous_mode'   => true,
            'menu'             => array(
                'slug'    => 'gutenslider',
                'account' => false,
                'contact' => false,
                'support' => false,
                'pricing' => false,
                'addons'  => false,
                'parent'  => array(
                    'slug' => 'options-general.php',
                ),
            ),
            'is_live'          => true,
        ) );
    }
    return $gutenslider_fs;
}

gutenslider_fs();
gutenslider_fs()->add_filter( 'show_deactivation_feedback_form', '__return_false' );
gutenslider_fs()->add_filter( 'redirect_on_activation', '__return_false' );
gutenslider_fs()->add_filter( 'show_trial', '__return_false' );
gutenslider_fs()->add_filter( 'show_affiliate_program_notice', '__return_false' );
gutenslider_fs()->add_filter( 'show_customizer_upsell', '__return_false' );
gutenslider_fs()->add_filter(
    'show_admin_notice',
    function ( $show, $msg ) {
        return ( in_array( $msg['id'], array('connect_account', 'premium_activated'), true ) || 'promotion' === $msg['type'] ? false : $show );
    },
    10,
    2
);
add_filter( 'plugin_action_links_' . gutenslider_fs()->get_plugin_basename(), function ( $links ) {
    unset($links['opt-in-or-opt-out gutenslider']);
    return $links;
}, WP_FS__DEFAULT_PRIORITY + 1 );
do_action( 'gutenslider_fs_loaded' );