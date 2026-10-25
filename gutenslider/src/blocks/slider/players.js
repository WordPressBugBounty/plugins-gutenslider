/**
 * The players embeds.js puts into video slides, one small adapter each:
 *
 * - `src( id, options, { time, play, loop, origin } )`: the player's URL;
 * - `play( iframe )`, `pause( iframe )`: postMessage commands (absent when
 *   the player has no API: then the slide unloads the player instead);
 * - `connect( iframe, p, id )`: asks the player for its events after load;
 * - `message( data, iframe, p )`: the player's own message, as
 *   { time, state, ready, muted, volume } (state: 'playing', 'paused',
 *   'ended' or 'buffering'; volume 0–1; `change` when every sound report
 *   is a change, not the player's state);
 * - `sound( iframe, { muted, volume } )`: sets mute and volume;
 * - `origin`: where the player's messages come from, and where commands go.
 *
 * Players for other providers come from the `players` view module (see
 * adapters() in embeds.js), in the same shape.
 *
 * No script is loaded from YouTube: the privacy-friendly player on
 * youtube-nocookie.com.
 */

export const post = ( iframe, origin, message ) =>
	iframe?.contentWindow?.postMessage( message, origin );

export const flag = ( value ) => ( value ? '1' : '0' );

/**
 * YouTube's IFrame API over postMessage (enablejsapi).
 */
const YOUTUBE = 'https://www.youtube-nocookie.com';
// -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
const YOUTUBE_STATES = {
	0: 'ended',
	1: 'playing',
	2: 'paused',
	3: 'buffering',
};
const youtubeCommand = ( iframe, func, args = [] ) =>
	post( iframe, YOUTUBE, JSON.stringify( { event: 'command', func, args } ) );

export const youtube = {
	origin: YOUTUBE,
	title: 'YouTube',
	src( id, o, { time, play, loop, origin } ) {
		const query = new URLSearchParams( {
			enablejsapi: '1',
			playsinline: '1',
			rel: '0',
			autoplay: flag( play ),
			mute: flag( o.muted ),
			controls: flag( o.controls !== false ),
			origin,
		} );
		if ( time > 1 ) {
			query.set( 'start', String( Math.floor( time ) ) );
		}
		if ( loop ) {
			query.set( 'loop', '1' );
			query.set( 'playlist', id );
		}
		return `${ YOUTUBE }/embed/${ id }?${ query }`;
	},
	// Ask the player for its events until it answers.
	connect( iframe, p, id ) {
		let tries = 0;
		const listen = () => {
			if ( p.iframe !== iframe || p.answered || tries++ > 20 ) {
				return;
			}
			post(
				iframe,
				YOUTUBE,
				JSON.stringify( { event: 'listening', id, channel: 'widget' } )
			);
			iframe.ownerDocument.defaultView.setTimeout( listen, 250 );
		};
		listen();
	},
	play: ( iframe ) => youtubeCommand( iframe, 'playVideo' ),
	pause: ( iframe ) => youtubeCommand( iframe, 'pauseVideo' ),
	sound( iframe, { muted, volume } ) {
		if ( typeof volume === 'number' ) {
			youtubeCommand( iframe, 'setVolume', [
				Math.round( volume * 100 ),
			] );
		}
		if ( typeof muted === 'boolean' ) {
			youtubeCommand( iframe, muted ? 'mute' : 'unMute' );
		}
	},
	message( data ) {
		const info = data?.info;
		if ( data?.event === 'onReady' ) {
			return { ready: true };
		}
		if ( info && typeof info === 'object' ) {
			return {
				time: info.currentTime,
				state: YOUTUBE_STATES[ info.playerState ],
				muted: info.muted,
				volume:
					typeof info.volume === 'number'
						? info.volume / 100
						: undefined,
			};
		}
		return data?.event === 'onStateChange'
			? { state: YOUTUBE_STATES[ Number( info ) ] }
			: {};
	},
};
