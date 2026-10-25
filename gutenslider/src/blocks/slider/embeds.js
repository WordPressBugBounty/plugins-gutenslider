/**
 * Video slides from links on the page: the provider's player is put in for
 * the active slide only, and taken out again when the slide leaves (its
 * time is kept, so it goes on where it stopped). Until then the slide shows
 * its poster, so a slider of 20 videos loads one player, not 20. The
 * players themselves are in players.js (YouTube) and in the `players` view
 * module another plugin may add (adapters()).
 *
 * - Autoplay on: the active slide plays (muted unless "Sound" is on;
 *   browsers only allow sound after a click).
 * - A click on a poster: plays it; on a slide beside the active one, goes
 *   there first. Several slides per view and centered slides alike: the
 *   active (centered) slide is the one that plays.
 * - The slider's own autoplay waits while a video plays and moves on when
 *   it ends (players that say so).
 * - The slider scrolled out of view: the video pauses (or, for a player
 *   without commands, is taken out).
 * - Reduced motion: nothing plays by itself.
 * - While a video plays, the arrows and dots fade out after a moment
 *   without pointer movement, so they don't cover the player's controls;
 *   any pointer movement, touch or keyboard focus brings them back.
 * - Sound is shared by the slider's videos (players and <video> slides):
 *   mute or set the volume in one, and the others follow.
 *
 * Also plays the markup of 7.0 betas (.gs-yt with data-yt), from page caches.
 */
import { youtube } from './players';

const IDLE = 2000;

/**
 * The players for the slider's videos: YouTube's, plus those of the
 * `players` view module (its `players` export) when a video needs one.
 *
 * @param {HTMLElement} el         Slider element.
 * @param {Function}    loadModule Loads a view module (mount.js).
 * @return {Promise<Object>} Players by provider.
 */
export async function adapters( el, loadModule ) {
	const own = { youtube };
	const more = [ ...el.querySelectorAll( '.gs-embed[data-provider]' ) ].some(
		( box ) => ! own[ box.dataset.provider ]
	);
	return {
		...( more ? ( await loadModule( 'players' ) )?.players : null ),
		...own,
	};
}

/**
 * @param {HTMLElement} el      Slider element.
 * @param {Object}      swiper  Swiper instance.
 * @param {Object}      players Players by provider (adapters()).
 * @return {Function} Teardown.
 */
export default function embeds( el, swiper, players = { youtube } ) {
	const doc = el.ownerDocument;
	const win = doc.defaultView;
	const boxes = () => el.querySelectorAll( '.gs-embed, .gs-yt' );
	const state = new Map();
	const sliderAutoplay = !! swiper.params.autoplay?.delay;
	let held = false;
	let pending = null;
	// The observer below says when the slider is on screen; until then
	// nothing plays.
	let inView = false;
	// Reduced motion: videos wait for a click.
	const still = win.matchMedia?.(
		'(prefers-reduced-motion: reduce)'
	).matches;
	// The editor's canvas is an about:srcdoc frame: its parent's origin.
	const origin =
		win.location.origin !== 'null'
			? win.location.origin
			: win.parent.location.origin;

	const options = ( box ) => {
		try {
			return JSON.parse(
				box.dataset.embedOptions || box.dataset.ytOptions || '{}'
			);
		} catch {
			return {};
		}
	};
	const player = ( box ) => {
		if ( ! state.has( box ) ) {
			const d = box.dataset;
			state.set( box, {
				adapter: players[ d.provider || 'youtube' ],
				id: d.embed || d.yt,
				title: d.embedTitle || d.ytTitle || '',
				time: 0,
				iframe: null,
				state: '',
			} );
		}
		return state.get( box );
	};
	const slideOf = ( box ) => box.closest( '.swiper-slide' );
	const active = () => swiper.slides[ swiper.activeIndex ];
	const activeBox = () => active()?.querySelector( '.gs-embed, .gs-yt' );

	function load( box, play ) {
		const p = player( box );
		if ( ! p.adapter || ! p.id ) {
			return;
		}
		if ( p.iframe ) {
			if ( play ) {
				p.adapter.play?.( p.iframe );
			}
			return;
		}
		const o = options( box );
		// The visitor's sound (see below) wins over the slide's "Muted".
		if ( typeof sound.muted === 'boolean' ) {
			o.muted = sound.muted;
		}
		const iframe = doc.createElement( 'iframe' );
		iframe.className = `gs-embed-frame${
			p.adapter === youtube ? ' gs-yt-frame' : ''
		}`;
		iframe.src = p.adapter.src( p.id, o, {
			time: p.time,
			play,
			// With the slider's autoplay the video plays once, then the
			// slider moves on.
			loop: !! o.loop && ! sliderAutoplay,
			origin,
		} );
		iframe.title = p.title || p.adapter.title;
		iframe.allow =
			'autoplay; encrypted-media; picture-in-picture; fullscreen';
		iframe.allowFullscreen = true;
		iframe.referrerPolicy = 'strict-origin-when-cross-origin';
		iframe.addEventListener( 'load', () =>
			p.adapter.connect?.( iframe, p, p.id )
		);
		p.iframe = iframe;
		p.answered = false;
		p.state = '';
		p.heard = {};
		box.append( iframe );
		box.classList.add( 'is-loaded' );
		wake();
		// Browsers block autoplay with sound until the page had a click (a
		// click inside a player may not count). A player that was asked to
		// play with sound and still does not play then plays muted, with its
		// own unmute button; the visitor's choice stays as it was.
		if ( play && ! o.muted && p.adapter.sound && p.adapter.play ) {
			win.setTimeout( () => {
				if (
					p.iframe === iframe &&
					! [ 'playing', 'buffering', 'paused', 'ended' ].includes(
						p.state
					)
				) {
					quiet( p );
					p.heard.muted = true;
					p.adapter.sound( iframe, { muted: true } );
					p.adapter.play( iframe );
				}
			}, 3500 );
		}
	}

	function unload( box ) {
		const p = state.get( box );
		if ( ! p?.iframe ) {
			return;
		}
		p.iframe.remove();
		p.iframe = null;
		p.state = '';
		box.classList.remove( 'is-loaded', 'is-playing' );
		wake();
	}

	// Pauses the video; a player without commands is taken out.
	function pause( box ) {
		const p = state.get( box );
		if ( ! p?.iframe ) {
			return;
		}
		if ( p.adapter.pause ) {
			p.adapter.pause( p.iframe );
		} else {
			unload( box );
		}
	}

	function holdSlider() {
		if ( sliderAutoplay && swiper.autoplay?.running ) {
			swiper.autoplay.stop();
			held = true;
		}
	}
	function releaseSlider( next ) {
		if ( ! held ) {
			return;
		}
		held = false;
		if ( next ) {
			swiper.slideNext();
		}
		swiper.autoplay?.start();
	}

	function onMessage( e ) {
		for ( const [ box, p ] of state ) {
			if ( ! p.iframe || p.iframe.contentWindow !== e.source ) {
				continue;
			}
			if ( e.origin !== p.adapter.origin || ! p.adapter.message ) {
				return;
			}
			let data = e.data;
			try {
				data = typeof data === 'string' ? JSON.parse( data ) : data;
			} catch {
				return;
			}
			p.answered = true;
			const result = p.adapter.message( data, p.iframe, p ) || {};
			if ( typeof result.time === 'number' ) {
				p.time = result.time;
			}
			if ( result.ready ) {
				tune( p );
			}
			heard( p, result );
			if ( result.state ) {
				changed( box, p, result.state );
			}
			return;
		}
	}

	/*
	 * Sound, shared by the slider's videos. When the visitor mutes, unmutes
	 * or sets the volume in one video, the others follow: the player on
	 * screen at once, the next ones when they load (the mute in their URL,
	 * then their volume commands once they are ready). Kept for the page
	 * in sessionStorage, so it survives the slider's remount at another
	 * breakpoint. Some players have mute only, or no sound control.
	 */
	const soundKey = `gutenslider-sound:${ win.location.pathname }#${ el.id }`;
	let sound = {};
	try {
		sound = JSON.parse( win.sessionStorage.getItem( soundKey ) ) || {};
	} catch {}
	const videos = () => el.querySelectorAll( '.eedee-background-div video' );

	// What we set is not the visitor's: reports right after it are ignored.
	const quiet = ( p ) => ( p.quietUntil = Date.now() + 1000 );

	// A player is ready: it gets the visitor's sound.
	function tune( p ) {
		if ( p.iframe && p.adapter.sound && Object.keys( sound ).length ) {
			quiet( p );
			p.heard = { ...p.heard, ...sound };
			p.adapter.sound( p.iframe, sound );
		}
	}

	// A player's sound report: a change from what it said before (its first
	// report is its starting state, not the visitor's doing).
	function heard( p, result ) {
		const changes = {};
		for ( const key of [ 'muted', 'volume' ] ) {
			const value = result[ key ];
			if (
				value === undefined ||
				value === null ||
				Number.isNaN( value )
			) {
				continue;
			}
			const known = result.change || key in p.heard;
			if (
				known &&
				p.heard[ key ] !== value &&
				! ( Date.now() < p.quietUntil )
			) {
				changes[ key ] = value;
			}
			p.heard[ key ] = value;
		}
		if ( Object.keys( changes ).length ) {
			share( p, changes );
		}
	}

	// The visitor changed the sound in `source` (a player or a <video>).
	function share( source, changes ) {
		const next = { ...sound, ...changes };
		if ( next.muted === sound.muted && next.volume === sound.volume ) {
			return;
		}
		sound = next;
		try {
			win.sessionStorage.setItem( soundKey, JSON.stringify( sound ) );
		} catch {}
		state.forEach( ( p ) => p !== source && tune( p ) );
		videos().forEach( ( video ) => video !== source && tuneVideo( video ) );
	}

	function tuneVideo( video ) {
		if ( typeof sound.volume === 'number' ) {
			video.volume = Math.min( 1, Math.max( 0, sound.volume ) );
		}
		// Browsers refuse sound before the page had a click (and unmuting a
		// playing video then pauses it): until then the videos stay muted,
		// and get the visitor's sound when their slide shows after one.
		const blocked = ! win.navigator.userActivation?.hasBeenActive;
		if ( sound.muted === true || ( sound.muted === false && ! blocked ) ) {
			video.muted = sound.muted;
		}
		// What we set; its volumechange is not the visitor's.
		video.gsSound = { muted: video.muted, volume: video.volume };
	}

	// <video> slides: volumechange does not bubble, so listen while it
	// goes down. What we set (tuneVideo(), a forced mute) is skipped.
	const onVolume = ( e ) => {
		const video = e.target;
		const own = video.gsSound;
		if ( video.gsForcedMute ) {
			video.gsForcedMute = false;
			return;
		}
		if ( own?.muted === video.muted && own?.volume === video.volume ) {
			return;
		}
		if ( video.matches?.( '.eedee-background-div video' ) ) {
			share( video, { muted: video.muted, volume: video.volume } );
		}
	};

	function changed( box, p, value ) {
		if ( value === p.state ) {
			return;
		}
		p.state = value;
		box.classList.toggle(
			'is-playing',
			value === 'playing' || value === 'buffering'
		);
		if ( value === 'playing' ) {
			holdSlider();
		} else if ( value === 'ended' ) {
			p.time = 0;
			releaseSlider( true );
		}
		wake();
	}

	/*
	 * Arrows and dots over a playing video: they fade out after IDLE ms
	 * without pointer movement over the slider, on narrow and touch screens
	 * (where a player's own controls sit under them; on a desktop the
	 * arrows stay). The page gets no pointer events from inside a player,
	 * so they also come back when the video pauses or ends, and when a
	 * click or tap goes into the player (the window loses focus to it).
	 * Keyboard focus always shows them (see embeds.scss).
	 */
	const small = win.matchMedia?.( '(max-width: 960px), (hover: none)' );
	let idleTimer = 0;
	let lastKey = 0;
	let tapped = null;
	const focusedPlayer = () => {
		const focused = doc.activeElement;
		return focused?.matches?.( '.gs-embed-frame, .gs-yt-frame' ) &&
			el.contains( focused )
			? focused
			: null;
	};
	const busy = () => {
		const p = state.get( activeBox() );
		if ( ! p?.iframe || ! small?.matches ) {
			return false;
		}
		// Without events a loaded player counts as playing.
		return (
			! p.adapter.message ||
			p.state === 'playing' ||
			p.state === 'buffering'
		);
	};
	function wake() {
		el.classList.remove( 'gs-nav-idle' );
		win.clearTimeout( idleTimer );
		if ( busy() ) {
			idleTimer = win.setTimeout( () => {
				const idle = busy();
				el.classList.toggle( 'gs-nav-idle', idle );
				// After a click or tap into the player, the page takes the
				// focus back, so the next one tells again. Not after the Tab
				// key: keyboard users stay in the player.
				if ( idle && tapped && focusedPlayer() === tapped ) {
					tapped.blur();
				}
				tapped = null;
			}, IDLE );
		}
	}
	const onKey = () => ( lastKey = Date.now() );
	const onBlur = () => {
		const frame = focusedPlayer();
		if ( frame ) {
			tapped = Date.now() - lastKey > 500 ? frame : null;
			wake();
		}
	};

	function onTransitionStart() {
		const current = active();
		videos().forEach( tuneVideo );
		state.forEach( ( p, box ) => {
			if ( slideOf( box ) !== current ) {
				pause( box );
			}
		} );
	}

	let settled = null;
	function onTransitionEnd() {
		const current = active();
		// Once per slide: a paused video stays paused through later events.
		if ( current === settled && ! pending ) {
			return;
		}
		settled = current;
		boxes().forEach( ( box ) => {
			if ( slideOf( box ) !== current ) {
				unload( box );
			}
		} );
		const box = activeBox();
		if ( held && ! box ) {
			releaseSlider( false );
		}
		if ( ! box || ! inView ) {
			pending = null;
			return;
		}
		const play =
			pending === box || ( ! still && options( box ).autoplay !== false );
		pending = null;
		if ( play ) {
			load( box, true );
		}
	}

	function onClick( e ) {
		const target = e.target.closest?.(
			'.gs-embed-play, .gs-yt-play, .gs-embed > img, .gs-yt > img'
		);
		const box = target?.closest( '.gs-embed, .gs-yt' );
		if ( ! box || ! el.contains( box ) ) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const slide = slideOf( box );
		if ( slide === active() ) {
			load( box, true );
			return;
		}
		pending = box;
		// Loop mode moves slides around: go by the slide's own index.
		if ( swiper.params.loop && slide.dataset.swiperSlideIndex ) {
			swiper.slideToLoop( Number( slide.dataset.swiperSlideIndex ) );
		} else {
			swiper.slideTo( swiper.slides.indexOf( slide ) );
		}
	}

	const observer = new win.IntersectionObserver(
		( [ entry ] ) => {
			inView = entry.isIntersecting;
			const box = activeBox();
			if ( ! inView ) {
				if ( box ) {
					pause( box );
				}
			} else if ( box && ! still && options( box ).autoplay !== false ) {
				settled = active();
				load( box, true );
			}
		},
		{ threshold: 0.25 }
	);

	// Swiper skips slideChangeTransitionEnd in some loop moves (slideToLoop
	// right after a loop fix): settle on any transition end, and after the
	// transition time at the latest. Settling twice does nothing new.
	let timer = 0;
	const onChange = () => {
		onTransitionStart();
		win.clearTimeout( timer );
		timer = win.setTimeout(
			onTransitionEnd,
			( Number( swiper.params.speed ) || 300 ) + 100
		);
	};

	const activity = [ 'pointermove', 'pointerdown', 'focusin' ];
	win.addEventListener( 'message', onMessage );
	el.addEventListener( 'volumechange', onVolume, true );
	videos().forEach( tuneVideo );
	win.addEventListener( 'blur', onBlur );
	doc.addEventListener( 'keydown', onKey, true );
	el.addEventListener( 'click', onClick, true );
	activity.forEach( ( type ) =>
		el.addEventListener( type, wake, { passive: true } )
	);
	swiper.on( 'slideChange', onChange );
	swiper.on( 'slideChangeTransitionEnd', onTransitionEnd );
	swiper.on( 'transitionEnd', onTransitionEnd );
	observer.observe( el );

	return () => {
		observer.disconnect();
		win.removeEventListener( 'message', onMessage );
		win.removeEventListener( 'blur', onBlur );
		doc.removeEventListener( 'keydown', onKey, true );
		el.removeEventListener( 'click', onClick, true );
		activity.forEach( ( type ) => el.removeEventListener( type, wake ) );
		el.removeEventListener( 'volumechange', onVolume, true );
		win.clearTimeout( timer );
		win.clearTimeout( idleTimer );
		el.classList.remove( 'gs-nav-idle' );
		swiper.off( 'slideChange', onChange );
		swiper.off( 'slideChangeTransitionEnd', onTransitionEnd );
		swiper.off( 'transitionEnd', onTransitionEnd );
		boxes().forEach( unload );
	};
}
