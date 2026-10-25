<?php
/**
 * A video source: a kind of link the "Add videos" dialog reads (a YouTube
 * video, a playlist…) and the videos behind it.
 *
 * Sources only read links in the editor. The page never needs them: a slide
 * saves what it plays (provider, id, size, poster), and Embed renders it.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

defined( 'ABSPATH' ) || exit;

/**
 * One kind of video link.
 */
abstract class Video_Source {

	/**
	 * Unique key, e.g. 'youtube'.
	 *
	 * @return string
	 */
	abstract public function key();

	/**
	 * Name for messages, e.g. "YouTube".
	 *
	 * @return string
	 */
	abstract public function label();

	/**
	 * Does this source read the link?
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	abstract public function matches( $url );

	/**
	 * The videos of a link: [ { provider, id, url, title, width, height,
	 * thumbnail, published } ], a list in the source's own order. The query
	 * (limit, order, Shorts) is applied after, by select().
	 *
	 * @param string $url   Link.
	 * @param array  $query Query settings (see Video_Sources::query()).
	 * @return array[]|\WP_Error
	 */
	abstract public function read( $url, $query );

	/**
	 * Is the link a list (playlist, channel, user)? The dialog shows the
	 * query settings for lists.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public function is_list( $url ) {
		return false;
	}

	/**
	 * A channel or user: its list is sorted newest first where dates exist.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public function is_account( $url ) {
		return false;
	}

	/**
	 * The query applied to a list: order, then the first `limit`.
	 *
	 * @param array[] $videos Videos, as read().
	 * @param array   $query  Query settings.
	 * @param string  $url    Link.
	 * @return array[]
	 */
	public function select( $videos, $query, $url ) {
		return array_slice( $this->order( $videos, $query, $url ), 0, $query['limit'] );
	}

	/**
	 * Accounts newest first (when every video has a date), then reversed if
	 * asked.
	 *
	 * @param array[] $videos Videos.
	 * @param array   $query  Query settings.
	 * @param string  $url    Link.
	 * @return array[]
	 */
	protected function order( $videos, $query, $url ) {
		$videos = array_values( $videos );
		if ( $this->is_account( $url ) && $videos && ! in_array( 0, array_map( 'intval', array_column( $videos, 'published' ) ), true ) ) {
			// usort is stable since PHP 8; the index keeps it so on 7.4.
			$keyed = array();
			foreach ( $videos as $i => $video ) {
				$keyed[] = array( (int) $video['published'], $i, $video );
			}
			usort(
				$keyed,
				static function ( $a, $b ) {
					return $a[0] === $b[0] ? $a[1] <=> $b[1] : $b[0] <=> $a[0];
				}
			);
			$videos = array_column( $keyed, 2 );
		}
		return 'reverse' === $query['order'] ? array_reverse( $videos ) : $videos;
	}

	/**
	 * A video in the shape every source returns.
	 *
	 * @param array $fields Fields.
	 * @return array
	 */
	protected function video( $fields ) {
		$video          = array_merge(
			array(
				'provider'  => $this->key(),
				'id'        => '',
				'url'       => '',
				'title'     => '',
				'width'     => 1920,
				'height'    => 1080,
				'thumbnail' => '',
				'published' => 0,
			),
			$fields
		);
		$video['title'] = sanitize_text_field( html_entity_decode( (string) $video['title'], ENT_QUOTES | ENT_XML1, 'UTF-8' ) );
		return $video;
	}

	/**
	 * A GET request; the body, or '' on failure.
	 *
	 * @param string $url  URL.
	 * @param array  $args wp_safe_remote_get() arguments.
	 * @return string
	 */
	protected static function fetch( $url, $args = array() ) {
		$response = wp_safe_remote_get( $url, $args + array( 'timeout' => 10 ) );
		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return '';
		}
		return (string) wp_remote_retrieve_body( $response );
	}

	/**
	 * JSON from a URL, or null.
	 *
	 * @param string $url URL.
	 * @return array|null
	 */
	protected static function json( $url ) {
		$data = json_decode( self::fetch( $url ), true );
		return is_array( $data ) ? $data : null;
	}

	/**
	 * How long cached() keeps what $read returns; $read may make it shorter
	 * (a fallback after a failed request should not stay for an hour).
	 *
	 * @var int
	 */
	protected $cache_time = HOUR_IN_SECONDS;

	/**
	 * A list, cached for an hour (the query is applied to the cached list,
	 * so another limit or order reads nothing again).
	 *
	 * @param string   $key  Cache key.
	 * @param callable $read Returns the list.
	 * @return array[]
	 */
	protected function cached( $key, $read ) {
		$transient = 'gutenslider_vs_' . md5( $this->key() . '|' . $key );
		$videos    = get_transient( $transient );
		if ( is_array( $videos ) ) {
			return $videos;
		}
		$this->cache_time = HOUR_IN_SECONDS;
		$videos           = $read();
		if ( $videos ) {
			set_transient( $transient, $videos, $this->cache_time );
		}
		return $videos;
	}

	/**
	 * Width and height from a ratio: oEmbed and thumbnail sizes are small,
	 * so near a common ratio it is that one.
	 *
	 * @param float $w Width.
	 * @param float $h Height.
	 * @return int[] [ width, height ].
	 */
	protected static function size( $w, $h ) {
		if ( $w <= 0 || $h <= 0 ) {
			return array( 1920, 1080 );
		}
		$ratio = $w / $h;
		foreach ( array( 16 / 9, 4 / 3, 1, 9 / 16, 21 / 9, 4 / 5 ) as $common ) {
			if ( abs( $ratio - $common ) / $common < 0.02 ) {
				$ratio = $common;
				break;
			}
		}
		return $ratio >= 1
			? array( 1920, (int) round( 1920 / $ratio ) )
			: array( (int) round( 1920 * $ratio ), 1920 );
	}
}
