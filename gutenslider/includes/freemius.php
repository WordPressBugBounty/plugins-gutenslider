<?php

/**
 * Freemius SDK: licensing and checkout for Gutenslider Pro, and nothing else.
 *
 * In wordpress.org compliance mode: after a single activation the admin sees
 * the opt-in screen once, and nothing is sent unless they allow it ("Skip"
 * sends nothing; the plugin row keeps an "Opt In" link). No reminder notice,
 * no trial, affiliate or Customizer promotions, no deactivation survey, and
 * no Freemius pages in the admin menu. Loaded through Composer
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
            'anonymous_mode'   => false,
            'menu'             => array(
                'account' => false,
                'contact' => false,
                'support' => false,
                'pricing' => false,
                'addons'  => false,
            ),
            'is_live'          => true,
        ) );
    }
    return $gutenslider_fs;
}

gutenslider_fs();
gutenslider_fs()->add_filter( 'show_deactivation_feedback_form', '__return_false' );
// The opt-in screen's icon ships with the plugin; without it Freemius fetches
// one from its API on localhost sites, before anyone has opted in.
gutenslider_fs()->add_filter( 'plugin_icon', function () {
    return dirname( __DIR__ ) . '/assets/icon.png';
} );
gutenslider_fs()->add_filter( 'show_trial', '__return_false' );
gutenslider_fs()->add_filter( 'show_affiliate_program_notice', '__return_false' );
gutenslider_fs()->add_filter( 'show_customizer_upsell', '__return_false' );
gutenslider_fs()->add_filter(
    'show_admin_notice',
    function ( $show, $msg ) {
        // The opt-in asks once, on its own screen: no reminders ("update-nag") elsewhere.
        return ( in_array( $msg['id'], array('connect_account', 'premium_activated'), true ) || in_array( $msg['type'], array('promotion', 'update-nag'), true ) ? false : $show );
    },
    10,
    2
);
// The opt-in page has no menu item, so WordPress finds no title for it and
// warns on PHP 8.1+ (strip_tags( null ) in admin-header.php).
add_action( 'load-admin_page_gutenslider', function () {
    global $title;
    if ( empty( $title ) ) {
        $title = __( 'Gutenslider', 'gutenslider' );
        // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- WordPress reads the admin page title from this global.
    }
} );
do_action( 'gutenslider_fs_loaded' );