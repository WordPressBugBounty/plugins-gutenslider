<?php
/**
 * YouTube videos and playlists, through YouTube's public oEmbed and feeds.
 *
 * A video's title and size come from oEmbed; a playlist's videos from its
 * feed (the newest 15). A Short (upright, 9:16) is a /shorts/ link, or a
 * feed entry that links to /shorts/.
 *
 * @package Gutenslider
 */

namespace Gutenslider;

defined( 'ABSPATH' ) || exit;

/**
 * YouTube links: videos (watch, youtu.be, shorts, embed, live) and playlists.
 */
class YouTube_Source extends Video_Source {

	const ID      = '[A-Za-z0-9_-]{11}';
	const LIST_ID = '[A-Za-z0-9_-]{10,64}';

	/**
	 * Key.
	 *
	 * @return string
	 */
	public function key() {
		return 'youtube';
	}

	/**
	 * Label.
	 *
	 * @return string
	 */
	public function label() {
		return 'YouTube';
	}

	/**
	 * The video id of a YouTube link (watch, youtu.be, shorts, embed, live).
	 *
	 * @param string $url Link.
	 * @return string Id, or ''.
	 */
	public static function video_id( $url ) {
		$url = trim( (string) $url );
		if ( preg_match( '#^' . self::ID . '$#', $url ) ) {
			return $url;
		}
		$patterns = array(
			'#youtu\.be/(' . self::ID . ')#',
			'#youtube(?:-nocookie)?\.com/(?:shorts|embed|live|v)/(' . self::ID . ')#',
			'#youtube\.com/.*[?&]v=(' . self::ID . ')#',
		);
		foreach ( $patterns as $pattern ) {
			if ( preg_match( $pattern, $url, $m ) ) {
				return $m[1];
			}
		}
		return '';
	}

	/**
	 * The playlist id of a link (list=…), not for YouTube's own mixes.
	 *
	 * @param string $url Link.
	 * @return string Id, or ''.
	 */
	public static function list_id( $url ) {
		if ( preg_match( '#youtube\.com/.*[?&]list=(' . self::LIST_ID . ')#', (string) $url, $m ) && 0 !== strpos( $m[1], 'RD' ) ) {
			return $m[1];
		}
		return '';
	}

	/**
	 * Matches video and playlist links.
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public function matches( $url ) {
		return '' !== self::list_id( $url ) || '' !== self::video_id( $url );
	}

	/**
	 * A playlist link (a watch link with list= counts as the playlist).
	 *
	 * @param string $url Link.
	 * @return bool
	 */
	public function is_list( $url ) {
		return '' !== self::list_id( $url );
	}

	/**
	 * The video, or the playlist's videos.
	 *
	 * @param string $url   Link.
	 * @param array  $query Query settings.
	 * @return array[]|\WP_Error
	 */
	public function read( $url, $query ) {
		$list = self::list_id( $url );
		if ( $list ) {
			$videos = $this->playlist( $list );
			return $videos ? $videos : new \WP_Error(
				'gutenslider_empty',
				/* translators: %s: a link */
				sprintf( __( 'No videos found in the playlist %s (private playlists cannot be read).', 'gutenslider' ), $url )
			);
		}
		return array( $this->oembed( self::video_id( $url ), false !== strpos( $url, '/shorts/' ) ) );
	}

	/**
	 * Order, then the first `limit` videos; Shorts left out unless asked
	 * for.
	 *
	 * @param array[] $videos Videos.
	 * @param array   $query  Query settings.
	 * @param string  $url    Link.
	 * @return array[]
	 */
	public function select( $videos, $query, $url ) {
		$videos = $this->order( $videos, $query, $url );
		if ( ! $query['shorts'] ) {
			$videos = array_filter(
				$videos,
				static function ( $video ) {
					return empty( $video['short'] );
				}
			);
		}
		return array_slice( array_values( $videos ), 0, $query['limit'] );
	}

	/**
	 * A Short: upright, 9:16.
	 *
	 * @param array $video Video.
	 * @return array
	 */
	public static function upright( $video ) {
		$video['width']  = 1080;
		$video['height'] = 1920;
		$video['short']  = true;
		return $video;
	}

	/**
	 * Title and size of one video (YouTube's oEmbed; 16:9 when it fails).
	 *
	 * @param string $id    Video id.
	 * @param bool   $short A YouTube Short (upright).
	 * @return array
	 */
	protected function oembed( $id, $short = false ) {
		$video = $this->item( $id, '' );
		$data  = self::json(
			add_query_arg(
				array(
					'url'    => rawurlencode( 'https://www.youtube.com/watch?v=' . $id ),
					'format' => 'json',
				),
				'https://www.youtube.com/oembed'
			)
		);
		if ( $data ) {
			$video['title'] = sanitize_text_field( $data['title'] ?? '' );
			list( $video['width'], $video['height'] ) = self::size( (float) ( $data['width'] ?? 0 ), (float) ( $data['height'] ?? 0 ) );
		}
		return $short ? self::upright( $video ) : $video;
	}

	/**
	 * The videos of a public playlist, from its feed: the newest 15.
	 *
	 * @param string $list Playlist id.
	 * @return array[]
	 */
	protected function playlist( $list ) {
		return $this->cached(
			'list:' . $list,
			function () use ( $list ) {
				return array_values( $this->feed( 'playlist_id=' . rawurlencode( $list ) ) );
			}
		);
	}

	/**
	 * The newest 15 videos from a feed (playlist_id=… or channel_id=…),
	 * with their dates; a Short's entry links to /shorts/.
	 *
	 * @param string $query Feed query.
	 * @return array[] By id.
	 */
	protected function feed( $query ) {
		$videos = array();
		$xml    = '';
		// YouTube's feeds answer 404 now and then for a list that exists:
		// a few tries, a moment apart.
		for ( $try = 0; $try < 4 && '' === $xml; $try++ ) {
			if ( $try ) {
				usleep( 400000 );
			}
			$xml = self::fetch( 'https://www.youtube.com/feeds/videos.xml?' . $query );
		}
		if ( preg_match_all( '#<entry>(.*?)</entry>#s', $xml, $entries ) ) {
			foreach ( $entries[1] as $entry ) {
				if ( ! preg_match( '#<yt:videoId>(' . self::ID . ')</yt:videoId>#', $entry, $id ) ) {
					continue;
				}
				preg_match( '#<title>(.*?)</title>#s', $entry, $title );
				preg_match( '#<published>(.*?)</published>#', $entry, $published );
				$video = $this->item( $id[1], $title[1] ?? '', (int) strtotime( $published[1] ?? '' ) );
				if ( false !== strpos( $entry, 'href="https://www.youtube.com/shorts/' . $id[1] . '"' ) ) {
					$video = self::upright( $video );
				}
				$videos[ $id[1] ] = $video;
			}
		}
		return $videos;
	}

	/**
	 * A video (16:9 until it turns out to be a Short: lists do not tell the
	 * size).
	 *
	 * @param string $id        Video id.
	 * @param string $title     Title.
	 * @param int    $published Time, if known.
	 * @return array
	 */
	protected function item( $id, $title, $published = 0 ) {
		return $this->video(
			array(
				'provider'  => 'youtube',
				'id'        => $id,
				'url'       => 'https://www.youtube.com/watch?v=' . $id,
				'title'     => $title,
				// maxresdefault is missing for some videos; hqdefault always exists.
				'thumbnail' => array(
					'https://i.ytimg.com/vi/' . $id . '/maxresdefault.jpg',
					'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg',
				),
				'published' => $published,
			)
		);
	}
}
