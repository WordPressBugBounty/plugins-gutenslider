/**
 * Video links in the editor: reading pasted links (YouTube videos and
 * playlists, video files, and what other plugins add) through the plugin's
 * REST route, the fields of a video slide with
 * a link, and the "Add videos" dialog of the slider.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Modal,
	Notice,
	RangeControl,
	SelectControl,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';

/** Provider names, for the slide sidebar. */
export const PROVIDERS = {
	youtube: 'YouTube',
	file: __( 'Video file', 'gutenslider' ),
};

/**
 * The videos of pasted links: { videos: [ { provider, id, url, title,
 * width, height, poster } ], errors: [] }. Posters are saved to the Media
 * Library.
 *
 * @param {string} links One link per line.
 * @param {Object} query { limit, order, shorts } for lists.
 * @return {Promise<Object>} Videos and errors.
 */
export const readVideos = ( links, query = {} ) =>
	apiFetch( {
		path: '/gutenslider/v1/videos',
		method: 'POST',
		data: { links, query },
	} );

/**
 * What the links are, without reading them: [ { link, source, label, list
 * } ].
 *
 * @param {string} links One link per line.
 * @return {Promise<Object[]>} Links.
 */
const inspectLinks = ( links ) =>
	apiFetch( {
		path: '/gutenslider/v1/videos',
		method: 'POST',
		data: { links, inspect: true },
	} ).then( ( result ) => result.links || [] );

/**
 * The background of a video slide from a link.
 *
 * @param {Object} video A video from readVideos().
 * @return {Object} Background fields.
 */
export function videoBackground( video ) {
	if ( video.provider === 'file' ) {
		return {
			backgroundType: 'video',
			backgroundVideo: {
				provider: 'file',
				url: video.url,
				mime: video.mime,
				title: video.title || '',
				embed: false,
			},
		};
	}
	return {
		backgroundType: 'video',
		backgroundVideo: {
			provider: video.provider || 'youtube',
			id: video.id,
			...( video.hash ? { hash: video.hash } : {} ),
			url: video.url || `https://www.youtube.com/watch?v=${ video.id }`,
			title: video.title || '',
			width: video.width || 1920,
			height: video.height || 1080,
		},
		backgroundImage: video.poster || {},
		// Autoplay: the slider's setting (videoAutoplay) until the slide sets its own.
		backgroundVideoSize: 'contain',
		backgroundVideoMuted: true,
		backgroundVideoLoop: false,
		backgroundVideoControls: true,
	};
}

const OPTIONS = [
	'backgroundVideoAutoplay',
	'backgroundVideoMuted',
	'backgroundVideoLoop',
	'backgroundVideoControls',
	'backgroundVideoSize',
];

/**
 * "Play when the slide shows": the slider's setting, or the slide's own.
 *
 * @param {Object}   props
 * @param {Object}   props.bg             Slide background.
 * @param {Function} props.update         Sets background fields.
 * @param {boolean}  props.sliderAutoplay The slider's videoAutoplay.
 */
export function VideoAutoplayControl( { bg, update, sliderAutoplay } ) {
	let value = 'slider';
	if ( typeof bg.backgroundVideoAutoplay === 'boolean' ) {
		value = bg.backgroundVideoAutoplay ? 'on' : 'off';
	}
	return (
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ __( 'Play when the slide shows', 'gutenslider' ) }
			help={ __(
				'Otherwise a play button. Videos pause when their slide leaves.',
				'gutenslider'
			) }
			value={ value }
			options={ [
				{
					value: 'slider',
					label: sliderAutoplay
						? __( 'As the slider (on)', 'gutenslider' )
						: __( 'As the slider (off)', 'gutenslider' ),
				},
				{ value: 'on', label: __( 'On', 'gutenslider' ) },
				{ value: 'off', label: __( 'Off', 'gutenslider' ) },
			] }
			onChange={ ( next ) =>
				update( {
					backgroundVideoAutoplay:
						next === 'slider' ? undefined : next === 'on',
				} )
			}
		/>
	);
}

/**
 * Link field + the options of a video slide with a link (slide sidebar).
 *
 * @param {Object}   props
 * @param {Object}   props.bg             Slide background.
 * @param {Function} props.update         Sets background fields.
 * @param {boolean}  props.sliderAutoplay The slider's videoAutoplay.
 */
export function VideoLinkFields( { bg, update, sliderAutoplay } ) {
	const video = bg.backgroundVideo || {};
	const embedded = !! video.provider && video.provider !== 'file';
	const provider = PROVIDERS[ video.provider ] || video.provider;
	const [ link, setLink ] = useState(
		video.provider || video.embed ? video.url || '' : ''
	);
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );

	const load = async () => {
		setBusy( true );
		setError( '' );
		try {
			const { videos, errors } = await readVideos( link, { limit: 1 } );
			if ( videos?.[ 0 ] ) {
				const next = videoBackground( videos[ 0 ] );
				// Keep the options already set on this slide.
				OPTIONS.forEach( ( key ) => {
					if ( embedded && key in bg ) {
						next[ key ] = bg[ key ];
					}
				} );
				update( next );
			} else {
				setError(
					errors?.[ 0 ] || __( 'No video found.', 'gutenslider' )
				);
			}
		} catch ( e ) {
			setError( e.message );
		}
		setBusy( false );
	};

	return (
		<>
			<div className="gutenslider-video-link">
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Video link', 'gutenslider' ) }
					placeholder="https://…"
					value={ link }
					onChange={ setLink }
					onKeyDown={ ( e ) => e.key === 'Enter' && load() }
				/>
				<Button
					__next40pxDefaultSize
					variant="secondary"
					onClick={ load }
					disabled={ busy || ! link.trim() }
				>
					{ busy ? <Spinner /> : __( 'Load', 'gutenslider' ) }
				</Button>
			</div>
			<p className="gutenslider-video-help">
				{ __(
					'YouTube, or a video file (.mp4, .webm).',
					'gutenslider'
				) }
			</p>
			{ error && (
				<Notice status="warning" isDismissible={ false }>
					{ error }
				</Notice>
			) }
			{ provider && (
				<p className="gutenslider-video-title">
					<strong>{ provider }</strong>
					{ video.title && `: ${ video.title }` }
				</p>
			) }
			{ embedded && (
				<>
					<ToggleGroupControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						isBlock
						label={ __( 'Size', 'gutenslider' ) }
						value={
							bg.backgroundVideoSize === 'cover'
								? 'cover'
								: 'contain'
						}
						onChange={ ( value ) =>
							update( { backgroundVideoSize: value } )
						}
					>
						<ToggleGroupControlOption
							value="contain"
							label={ __( 'Whole video', 'gutenslider' ) }
						/>
						<ToggleGroupControlOption
							value="cover"
							label={ __( 'Fill the slide', 'gutenslider' ) }
						/>
					</ToggleGroupControl>
					<VideoAutoplayControl
						bg={ bg }
						update={ update }
						sliderAutoplay={ sliderAutoplay }
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Muted', 'gutenslider' ) }
						help={ __(
							'Browsers only start videos with sound after a click.',
							'gutenslider'
						) }
						checked={ bg.backgroundVideoMuted !== false }
						onChange={ ( value ) =>
							update( { backgroundVideoMuted: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Loop', 'gutenslider' ) }
						help={ __(
							'With the slider’s autoplay, a video plays once and the slider moves on.',
							'gutenslider'
						) }
						checked={ bg.backgroundVideoLoop !== false }
						onChange={ ( value ) =>
							update( { backgroundVideoLoop: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Player controls', 'gutenslider' ) }
						checked={ bg.backgroundVideoControls !== false }
						onChange={ ( value ) =>
							update( { backgroundVideoControls: value } )
						}
					/>
				</>
			) }
		</>
	);
}

/**
 * The query settings of lists (playlists, channels, users): shown when a
 * pasted link is one.
 *
 * @param {Object}   props
 * @param {Object}   props.query    { limit, order, shorts }.
 * @param {Function} props.setQuery Sets query fields.
 * @param {boolean}  props.youtube  A YouTube list is among the links.
 */
function QuerySettings( { query, setQuery, youtube } ) {
	return (
		<fieldset className="gutenslider-video-query">
			<legend>{ __( 'Playlists and channels', 'gutenslider' ) }</legend>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Videos per link', 'gutenslider' ) }
				help={ __(
					'The first ones, in the order below.',
					'gutenslider'
				) }
				min={ 1 }
				max={ 50 }
				value={ query.limit }
				onChange={ ( limit ) => setQuery( { limit: limit || 12 } ) }
			/>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Order', 'gutenslider' ) }
				value={ query.order }
				options={ [
					{
						value: 'source',
						label: __(
							'As listed (channels: newest first)',
							'gutenslider'
						),
					},
					{
						value: 'reverse',
						label: __(
							'Reversed (channels: oldest first)',
							'gutenslider'
						),
					},
				] }
				onChange={ ( order ) => setQuery( { order } ) }
			/>
			{ youtube && (
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Include YouTube Shorts', 'gutenslider' ) }
					help={ __( 'Shorts play upright (9:16).', 'gutenslider' ) }
					checked={ query.shorts }
					onChange={ ( shorts ) => setQuery( { shorts } ) }
				/>
			) }
		</fieldset>
	);
}

/**
 * "Add videos": links of videos, playlists or channels, one slide per video.
 *
 * @param {Object}   props
 * @param {Function} props.onAdd   Receives the videos.
 * @param {Function} props.onClose Closes the dialog.
 */
export function AddVideosModal( { onAdd, onClose } ) {
	const [ links, setLinks ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ errors, setErrors ] = useState( [] );
	const [ inspected, setInspected ] = useState( [] );
	const [ query, setQueryState ] = useState( {
		limit: 12,
		order: 'source',
		shorts: true,
	} );
	const setQuery = ( changes ) =>
		setQueryState( ( current ) => ( { ...current, ...changes } ) );

	// What the links are (a list shows the query settings). A moment after
	// typing stops.
	useEffect( () => {
		if ( ! links.trim() ) {
			setInspected( [] );
			return;
		}
		let current = true;
		const timer = setTimeout(
			() =>
				inspectLinks( links )
					.then( ( found ) => current && setInspected( found ) )
					.catch( () => {} ),
			300
		);
		return () => {
			current = false;
			clearTimeout( timer );
		};
	}, [ links ] );

	const lists = inspected.filter( ( link ) => link.list );

	const add = async () => {
		setBusy( true );
		setErrors( [] );
		try {
			const result = await readVideos( links, query );
			setErrors( result.errors || [] );
			if ( result.videos?.length ) {
				onAdd( result.videos );
				if ( ! result.errors?.length ) {
					onClose();
				}
			}
		} catch ( e ) {
			setErrors( [ e.message ] );
		}
		setBusy( false );
	};

	return (
		<Modal
			title={ __( 'Add videos', 'gutenslider' ) }
			onRequestClose={ onClose }
			size="medium"
		>
			<TextareaControl
				__nextHasNoMarginBottom
				label={ __( 'Video links', 'gutenslider' ) }
				help={ __(
					'One per line; each video becomes a slide. YouTube videos and playlists, and links to video files (.mp4, .webm, .mov, .ogv). The thumbnails are saved to the Media Library.',
					'gutenslider'
				) }
				placeholder={
					'https://www.youtube.com/watch?v=…\nhttps://www.youtube.com/playlist?list=…'
				}
				rows={ 5 }
				value={ links }
				onChange={ setLinks }
			/>
			{ lists.length > 0 && (
				<QuerySettings
					query={ query }
					setQuery={ setQuery }
					youtube={ lists.some( ( link ) =>
						link.source.startsWith( 'youtube' )
					) }
				/>
			) }
			{ errors.map( ( error ) => (
				<Notice key={ error } status="warning" isDismissible={ false }>
					{ error }
				</Notice>
			) ) }
			<div className="gutenslider-video-actions">
				<Button variant="tertiary" onClick={ onClose }>
					{ __( 'Cancel', 'gutenslider' ) }
				</Button>
				<Button
					variant="primary"
					onClick={ add }
					disabled={ busy || ! links.trim() }
					isBusy={ busy }
				>
					{ busy
						? __( 'Reading the links…', 'gutenslider' )
						: __( 'Add videos', 'gutenslider' ) }
				</Button>
			</div>
		</Modal>
	);
}

/**
 * "3 videos added" for the snackbar.
 *
 * @param {number} n Videos.
 * @return {string} Message.
 */
export const addedMessage = ( n ) =>
	sprintf(
		/* translators: %d: number of videos */
		_n( '%d video added.', '%d videos added.', n, 'gutenslider' ),
		n
	);
