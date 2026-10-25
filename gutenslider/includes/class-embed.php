<?php
/**
 * Video slides from links on the page: the slide shows its poster and a
 * play button, and the view script (embeds.js) loads the provider's player
 * only for the slide on screen.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

defined( 'ABSPATH' ) || exit;

/**
 * Embedded players.
 */
final class Embed {

	/**
	 * The players and what their video ids look like (regular expressions),
	 * by provider. Another plugin adds providers with the
	 * `gutenslider_embed_providers` filter, and their players in its
	 * `players` view module (embeds.js).
	 *
	 * @return array<string, string>
	 */
	public static function providers() {
		$providers = apply_filters( 'gutenslider_embed_providers', array( 'youtube' => '#^[A-Za-z0-9_-]{11}$#' ) );
		return is_array( $providers ) ? array_filter( $providers, 'is_string' ) : array();
	}

	const YOUTUBE_PLAY = '<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true"><path class="gs-embed-play__bg" d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 12.9.1 24 .1 24s0 11.1 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35.1 67.9 24 67.9 24s0-11.1-1.4-16.3z"/><path d="M45 24 27 14v20z" fill="#fff"/></svg>';
	const PLAY         = '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><circle class="gs-embed-play__bg" cx="32" cy="32" r="32"/><path d="M26 20v24l19-12z" fill="#fff"/></svg>';

	/**
	 * The player of a saved slide video: { provider, id, hash }, or null
	 * for a file (or nothing). 6.x saved YouTube links with `embed`.
	 *
	 * @param array $video backgroundVideo.
	 * @return array|null
	 */
	public static function of( $video ) {
		if ( ! is_array( $video ) ) {
			return null;
		}
		$provider  = (string) ( $video['provider'] ?? '' );
		$id        = (string) ( $video['id'] ?? '' );
		$providers = self::providers();
		if ( isset( $providers[ $provider ] ) && preg_match( $providers[ $provider ], $id ) ) {
			return array(
				'provider' => $provider,
				'id'       => $id,
				'hash'     => preg_match( '#^[0-9a-f]{6,20}$#', (string) ( $video['hash'] ?? '' ) ) ? $video['hash'] : '',
			);
		}
		$id = ! empty( $video['embed'] ) ? YouTube_Source::video_id( $video['url'] ?? '' ) : '';
		return '' !== $id ? array(
			'provider' => 'youtube',
			'id'       => $id,
			'hash'     => '',
		) : null;
	}

	/**
	 * The slide media: the poster and a play button; the view script puts
	 * the player in when the slide is shown.
	 *
	 * @param array  $embed  Embed::of().
	 * @param array  $video  backgroundVideo.
	 * @param array  $bg     Slide background (with defaults).
	 * @param string $poster Poster image markup (may be '').
	 * @return string
	 */
	public static function markup( $embed, $video, $bg, $poster ) {
		$w       = max( 1, (int) ( $video['width'] ?? 1920 ) );
		$h       = max( 1, (int) ( $video['height'] ?? 1080 ) );
		$title   = (string) ( $video['title'] ?? '' );
		$youtube = 'youtube' === $embed['provider'];
		$options = array(
			'autoplay' => ! isset( $bg['backgroundVideoAutoplay'] ) || $bg['backgroundVideoAutoplay'],
			'muted'    => ! empty( $bg['backgroundVideoMuted'] ),
			'loop'     => ! empty( $bg['backgroundVideoLoop'] ),
			'controls' => ! isset( $bg['backgroundVideoControls'] ) || $bg['backgroundVideoControls'],
		);
		if ( '' !== $embed['hash'] ) {
			$options['hash'] = $embed['hash'];
		}
		if ( '' === $poster && $youtube ) {
			$poster = sprintf(
				'<img class="gs-slide-media" src="%1$s" alt="%2$s" loading="lazy" decoding="async" width="480" height="360">',
				esc_url( 'https://i.ytimg.com/vi/' . $embed['id'] . '/hqdefault.jpg' ),
				esc_attr( $title )
			);
		}
		// YouTube keeps the classes of 7.0 betas (gs-yt), for custom CSS.
		return sprintf(
			'<div class="gs-embed%1$s%2$s" data-provider="%3$s" data-embed="%4$s" data-embed-options="%5$s" data-embed-title="%6$s" style="--gs-embed-r:%7$s">%8$s<button type="button" class="gs-embed-play%9$s" aria-label="%10$s">%11$s</button></div>',
			$youtube ? ' gs-yt' : '',
			'cover' === ( $bg['backgroundVideoSize'] ?? '' ) ? ' is-cover' : '',
			esc_attr( $embed['provider'] ),
			esc_attr( $embed['id'] ),
			esc_attr( (string) wp_json_encode( $options ) ),
			esc_attr( $title ),
			esc_attr( (string) round( $w / $h, 4 ) ),
			$poster,
			$youtube ? ' gs-yt-play' : '',
			/* translators: %s: video title */
			esc_attr( '' !== $title ? sprintf( __( 'Play video: %s', 'gutenslider' ), $title ) : __( 'Play video', 'gutenslider' ) ),
			$youtube ? self::YOUTUBE_PLAY : self::PLAY
		);
	}
}
