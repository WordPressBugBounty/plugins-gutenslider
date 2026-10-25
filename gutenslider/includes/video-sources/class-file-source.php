<?php
/**
 * Direct links to video files (free): .mp4, .webm, .mov, .ogv. The slide
 * plays the file in a <video>, like a video from the Media Library.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

defined( 'ABSPATH' ) || exit;

/**
 * A link to a video file.
 */
class File_Source extends Video_Source {

	const TYPES = array(
		'mp4'  => 'video/mp4',
		'm4v'  => 'video/mp4',
		'webm' => 'video/webm',
		'mov'  => 'video/quicktime',
		'ogv'  => 'video/ogg',
	);

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key() {
		return 'file';
	}

	/**
	 * Label.
	 *
	 * @return string
	 */
	public function label() {
		return __( 'Video file', 'gutenslider' );
	}

	/**
	 * The file type of a link, or ''.
	 *
	 * @param string $url Link.
	 * @return string Extension.
	 */
	private static function extension( $url ) {
		$path = (string) wp_parse_url( (string) $url, PHP_URL_PATH );
		$ext  = strtolower( pathinfo( $path, PATHINFO_EXTENSION ) );
		return isset( self::TYPES[ $ext ] ) ? $ext : '';
	}

	/**
	 * Matches http(s) links ending in a video file type.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public function matches( $url ) {
		return (bool) preg_match( '#^https?://#i', (string) $url ) && '' !== self::extension( $url );
	}

	/**
	 * The file, if it answers as a video. Only its headers are read: the
	 * size shows once the browser loads it.
	 *
	 * @param string $url   Link.
	 * @param array  $query Query settings.
	 * @return array[]|\WP_Error
	 */
	public function read( $url, $query ) {
		$url      = esc_url_raw( $url );
		$response = wp_safe_remote_head(
			$url,
			array(
				'timeout'     => 10,
				'redirection' => 3,
			)
		);
		$type     = strtolower( (string) wp_remote_retrieve_header( $response, 'content-type' ) );
		$code     = (int) wp_remote_retrieve_response_code( $response );
		// Some servers refuse HEAD: then the link is trusted as it is.
		if ( ! is_wp_error( $response ) && $code < 400 && '' !== $type && 0 !== strpos( $type, 'video/' ) && false === strpos( $type, 'octet-stream' ) ) {
			return new \WP_Error(
				'gutenslider_not_video',
				/* translators: %s: a link */
				sprintf( __( '%s is not a video file.', 'gutenslider' ), $url )
			);
		}
		$mime = 0 === strpos( $type, 'video/' ) ? strtok( $type, ';' ) : self::TYPES[ self::extension( $url ) ];
		return array(
			$this->video(
				array(
					'id'     => md5( $url ),
					'url'    => $url,
					'title'  => rawurldecode( wp_basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ) ),
					'mime'   => $mime,
					'width'  => 0,
					'height' => 0,
				)
			),
		);
	}
}
