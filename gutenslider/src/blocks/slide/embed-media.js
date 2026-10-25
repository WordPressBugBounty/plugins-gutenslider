/**
 * A video slide's media as Embed::markup() prints it: the poster and a
 * play button. The view script
 * (embeds.js) puts the player in; in the editor it only runs in Preview.
 */
import { __, sprintf } from '@wordpress/i18n';

const YOUTUBE_PLAY =
	'M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 12.9.1 24 .1 24s0 11.1 1.4 16.3a8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35.1 67.9 24 67.9 24s0-11.1-1.4-16.3z';

/**
 * @param {Object} props
 * @param {Object} props.embed slideParts().embed.
 */
export default function EmbedMedia( { embed } ) {
	const youtube = embed.provider === 'youtube';
	return (
		<div
			className={ [
				'gs-embed',
				youtube && 'gs-yt',
				embed.cover && 'is-cover',
			]
				.filter( Boolean )
				.join( ' ' ) }
			data-provider={ embed.provider }
			data-embed={ embed.id }
			data-embed-options={ JSON.stringify( embed.options ) }
			data-embed-title={ embed.title }
			style={ { '--gs-embed-r': embed.ratio } }
		>
			{ embed.poster && (
				<img
					className="gs-slide-media"
					src={ embed.poster.url }
					alt={ embed.poster.alt || embed.title || '' }
					width={ embed.poster.width }
					height={ embed.poster.height }
					draggable={ false }
				/>
			) }
			<button
				type="button"
				className={ `gs-embed-play${ youtube ? ' gs-yt-play' : '' }` }
				tabIndex={ -1 }
				aria-label={
					embed.title
						? sprintf(
								/* translators: %s: video title */
								__( 'Play video: %s', 'gutenslider' ),
								embed.title
							)
						: __( 'Play video', 'gutenslider' )
				}
			>
				{ youtube ? (
					<svg
						viewBox="0 0 68 48"
						width="68"
						height="48"
						aria-hidden="true"
					>
						<path
							className="gs-embed-play__bg"
							d={ YOUTUBE_PLAY }
						/>
						<path d="M45 24 27 14v20z" fill="#fff" />
					</svg>
				) : (
					<svg
						viewBox="0 0 64 64"
						width="64"
						height="64"
						aria-hidden="true"
					>
						<circle
							className="gs-embed-play__bg"
							cx="32"
							cy="32"
							r="32"
						/>
						<path d="M26 20v24l19-12z" fill="#fff" />
					</svg>
				) }
			</button>
		</div>
	);
}
