<?php
/**
 * Video sources: the "Add videos" dialog sends pasted links here, and each
 * video comes back with its title, its size and its thumbnail saved to the
 * Media Library (the slide's poster).
 *
 * Reads YouTube videos and playlists and links to video files; other
 * plugins add sources through the `gutenslider_video_sources` filter.
 * Sliders never depend on this: the page plays what the slide saved (see
 * Embed).
 *
 * @package Gutenslider
 */

namespace Gutenslider;

defined( 'ABSPATH' ) || exit;

/**
 * The sources, and the REST route that reads links.
 */
final class Video_Sources {

	// Videos per request, all links together.
	const MAX = 50;
	// Meta on a poster attachment: "provider:id".
	const META_KEY = '_gutenslider_video';
	// Posters saved by 7.0 betas for YouTube (the video id).
	const YOUTUBE_META_KEY = '_gutenslider_youtube_id';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * The registered sources, by key.
	 *
	 * @return Video_Source[]
	 */
	public static function sources() {
		$sources = array();
		/**
		 * Filters the video sources the "Add videos" dialog reads.
		 *
		 * @param Video_Source[] $sources Sources.
		 */
		foreach ( apply_filters( 'gutenslider_video_sources', array( new YouTube_Source(), new File_Source() ) ) as $source ) {
			if ( $source instanceof Video_Source ) {
				$sources[ $source->key() ] = $source;
			}
		}
		return $sources;
	}

	/**
	 * The source that reads a link, or null.
	 *
	 * @param string $url Link.
	 * @return Video_Source|null
	 */
	public static function find( $url ) {
		foreach ( self::sources() as $source ) {
			if ( $source->matches( $url ) ) {
				return $source;
			}
		}
		return null;
	}

	/**
	 * POST gutenslider/v1/videos { links, query: { limit, order, shorts },
	 * inspect }, and gutenslider/v1/youtube (7.0 betas: all of a playlist).
	 */
	public static function routes() {
		$permission = static function () {
			return current_user_can( 'upload_files' );
		};
		$links      = array(
			'type'              => 'string',
			'required'          => true,
			'sanitize_callback' => array( __CLASS__, 'sanitize_links' ),
		);
		register_rest_route(
			'gutenslider/v1',
			'/videos',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'rest' ),
				'permission_callback' => $permission,
				'args'                => array(
					'links'   => $links,
					'query'   => array(
						'type'              => 'object',
						'default'           => array(),
						'sanitize_callback' => array( __CLASS__, 'query' ),
					),
					'inspect' => array(
						'type'              => 'boolean',
						'default'           => false,
						'sanitize_callback' => 'rest_sanitize_boolean',
					),
				),
			)
		);
		register_rest_route(
			'gutenslider/v1',
			'/youtube',
			array(
				'methods'             => 'POST',
				'callback'            => static function ( $request ) {
					return self::read_links( $request['links'], array( 'limit' => self::MAX ) );
				},
				'permission_callback' => $permission,
				'args'                => array( 'links' => $links ),
			)
		);
	}

	/**
	 * REST: read the links, or only say what they are (inspect).
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return array
	 */
	public static function rest( $request ) {
		return $request['inspect']
			? array( 'links' => self::inspect( $request['links'] ) )
			: self::read_links( $request['links'], (array) $request['query'] );
	}

	/**
	 * The pasted links, one per line (or separated by spaces or commas).
	 *
	 * @param string $links Links.
	 * @return string[]
	 */
	private static function split( $links ) {
		return preg_split( '/[\s,]+/', (string) $links, -1, PREG_SPLIT_NO_EMPTY );
	}

	/**
	 * The pasted links, each cleaned as a URL (percent-encoding kept), one
	 * per line. A bare id (a YouTube video id) stays as it is.
	 *
	 * @param string $links Links.
	 * @return string
	 */
	public static function sanitize_links( $links ) {
		$clean = array();
		foreach ( self::split( $links ) as $link ) {
			$clean[] = preg_match( '#^[A-Za-z0-9_-]+$#', $link ) ? $link : esc_url_raw( $link );
		}
		return implode( "\n", array_filter( $clean ) );
	}

	/**
	 * The query settings, checked: limit 1–50 (12), order 'source' or
	 * 'reverse', Shorts included or not.
	 *
	 * @param array $query Query.
	 * @return array
	 */
	public static function query( $query ) {
		$limit = isset( $query['limit'] ) ? (int) $query['limit'] : 12;
		return array(
			'limit'  => max( 1, min( self::MAX, $limit ) ),
			'order'  => 'reverse' === ( $query['order'] ?? '' ) ? 'reverse' : 'source',
			'shorts' => ! isset( $query['shorts'] ) || rest_sanitize_boolean( $query['shorts'] ),
		);
	}

	/**
	 * What each link is, without reading it: the dialog shows the query
	 * settings when a list is among them.
	 *
	 * @param string $links Links.
	 * @return array[] { link, source, label, list }.
	 */
	public static function inspect( $links ) {
		$found = array();
		foreach ( self::split( $links ) as $link ) {
			$source  = self::find( $link );
			$found[] = array(
				'link'   => $link,
				'source' => $source ? $source->key() : '',
				'label'  => $source ? $source->label() : '',
				'list'   => $source ? $source->is_list( $link ) : false,
			);
		}
		return $found;
	}

	/**
	 * The videos of the pasted links, in order, without repeats, each with
	 * its poster.
	 *
	 * @param string $links Links.
	 * @param array  $query Query settings.
	 * @return array { videos, errors }.
	 */
	public static function read_links( $links, $query = array() ) {
		$query  = self::query( $query );
		$videos = array();
		$errors = array();
		foreach ( self::split( $links ) as $link ) {
			$source = self::find( $link );
			if ( ! $source ) {
				/* translators: %s: what was pasted */
				$errors[] = sprintf( __( '%s is not a supported video link.', 'gutenslider' ), $link );
				continue;
			}
			$items = $source->read( $link, $query );
			if ( is_wp_error( $items ) ) {
				$errors[] = $items->get_error_message();
				continue;
			}
			if ( $source->is_list( $link ) ) {
				$items = $source->select( $items, $query, $link );
			}
			foreach ( $items as $item ) {
				$key            = $item['provider'] . ':' . $item['id'];
				$videos[ $key ] = $videos[ $key ] ?? $item;
			}
			if ( count( $videos ) >= self::MAX ) {
				break;
			}
		}
		$videos = array_slice( array_values( $videos ), 0, self::MAX );
		foreach ( $videos as &$video ) {
			$video['poster'] = self::poster( $video );
			unset( $video['thumbnail'] );
		}
		return array(
			'videos' => $videos,
			'errors' => $errors,
		);
	}

	/**
	 * The video's thumbnail in the Media Library, saved once per video.
	 *
	 * @param array $video Video (thumbnail: a URL, or URLs to try in order).
	 * @return array|null { id, url, width, height, alt }.
	 */
	public static function poster( $video ) {
		if ( empty( $video['thumbnail'] ) ) {
			return null;
		}
		$title      = (string) $video['title'];
		$attachment = self::attachment( $video['provider'], $video['id'] );
		if ( ! $attachment ) {
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
			foreach ( (array) $video['thumbnail'] as $url ) {
				$tmp = download_url( $url, 15 );
				if ( is_wp_error( $tmp ) ) {
					continue;
				}
				$result = media_handle_sideload(
					array(
						'name'     => sanitize_file_name( $video['provider'] . '-' . $video['id'] ) . '.jpg',
						'tmp_name' => $tmp,
					),
					0,
					'' !== $title ? $title : $video['provider'] . ' ' . $video['id']
				);
				if ( is_wp_error( $result ) ) {
					wp_delete_file( $tmp );
					continue;
				}
				$attachment = (int) $result;
				update_post_meta( $attachment, self::META_KEY, $video['provider'] . ':' . $video['id'] );
				update_post_meta( $attachment, '_wp_attachment_image_alt', $title );
				break;
			}
		}
		if ( ! $attachment ) {
			return null;
		}
		$src = wp_get_attachment_image_src( $attachment, 'full' );
		return array(
			'id'     => $attachment,
			'url'    => $src[0] ?? '',
			'width'  => (int) ( $src[1] ?? 0 ),
			'height' => (int) ( $src[2] ?? 0 ),
			'alt'    => $title,
		);
	}

	/**
	 * The poster saved before for this video, or 0.
	 *
	 * @param string $provider Provider.
	 * @param string $id       Video id.
	 * @return int Attachment id.
	 */
	private static function attachment( $provider, $id ) {
		$meta = array(
			array(
				'key'   => self::META_KEY,
				'value' => $provider . ':' . $id,
			),
		);
		if ( 'youtube' === $provider ) {
			$meta[]           = array(
				'key'   => self::YOUTUBE_META_KEY,
				'value' => $id,
			);
			$meta['relation'] = 'OR';
		}
		$found = get_posts(
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'meta_query'     => $meta, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);
		return $found ? (int) $found[0] : 0;
	}
}
