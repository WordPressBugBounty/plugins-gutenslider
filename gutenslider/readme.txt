=== Gutenslider — Slider Block for the Block Editor ===
Contributors: eedee
Tags: slider, carousel, slideshow, hero, image slider
Requires at least: 6.6
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 7.3.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A slider block for images, videos and any blocks on top: carousels, hero sliders and fullscreen background sliders.

== Description ==

Gutenslider adds a slider block to the block editor. Each slide has a background (image, video, color or gradient) and holds any blocks you like on top: headings, paragraphs, buttons, columns. You build and style the slider where you write your content, and the editor shows it the way visitors will see it.

https://www.youtube.com/watch?v=Qkr8BlGQL-o

**[Examples and documentation](https://gutenslider.org/examples/)**

= How to use it =

1. In the block editor, add a **Gutenslider** block.
2. Pick images or videos from the Media Library. Each one becomes a slide.
3. Select a slide and add blocks on top of it, or keep one set of content fixed above all slides.
4. Choose the transition, arrows, dots, height and autoplay in the block settings, per device (desktop, tablet, mobile).
5. Publish.

= Features =

* Unlimited slides with an image, a video from the Media Library or from a link, a color or a gradient as background, a focal point for each image and video, and a color or gradient overlay.
* Video sliders from links: paste YouTube video or playlist links, or links to video files (.mp4, .webm, .mov, .ogv), and every video becomes a slide. For playlists (the newest 15 videos, from the playlist's feed): how many, in which order, with or without YouTube Shorts. The slide on screen plays (muted, or with sound after a click), the others pause and show their thumbnail; each slide keeps its video's shape (16:9, or upright for Shorts). Works with several slides per view and centered slides.
* Videos play when their slide shows (a slider setting, and per slide), the slider's autoplay waits for a playing video, and the videos of a slider share their sound: mute or turn up one, and the others follow.
* On small screens the arrows and dots fade while a video plays, so they don't cover the player's controls, and come back on any touch, pointer movement or keyboard focus.
* Any blocks on top of a slide.
* Two content modes: content per slide, or the same content on all slides while the backgrounds change.
* Transitions: slide, fade and flip, with transition time and time per slide.
* Up to eight slides per view (or automatic width), slides per step, space between slides, loop, centered slides, random order, autoplay with pause on hover.
* Arrows in eleven styles or as text ("Previous", "Next" in the site's font), and dots, with size and colors; on or off per device.
* Arrow positions (sides, next to the blocks below or above the image, top and bottom, corners), offsets, spacing and blend mode; dot positions (bottom, top, left, right) and an offset.
* Settings per device (desktop, tablet, mobile): slides per view, height, arrows, dots and visibility.
* Slider height in px or vh, height that grows with the content, wide and full alignment, and a full-screen mode.
* Content position (top, center, bottom, left, right), and the slide's blocks on the image, below it or above it.
* Shape dividers at the top and bottom, in fifteen shapes, with color, height, flip and invert.
* Linked slides, keyboard navigation and hash navigation (a link can open a specific slide).
* Image slides can link to their image file, for lightbox plugins that open linked images (one gallery per slider with Lightbox with PhotoSwipe).
* A lightbox for the slide images and videos, and for Image and Video blocks on the slides: it opens out of the image (or fades in), pages with arrows, keyboard and swipe, shows a counter, thumbnails and a heading and text from the image's title, caption or description, and comes in light, dark or your own colors.
* Blend modes and opacity for the content on the slides.
* Automatic captions from the Media Library; slides can be hidden.
* A Preview button in the editor that runs the slider as visitors see it.

= Speed and accessibility =

The front end uses the Interactivity API. The slider's layout is rendered on the server, so the page does not shift when the script starts. Swiper and the modules a slider needs load only when the slider comes near the viewport. Images get responsive `srcset` and `sizes`; the first visible image loads with high priority, the others lazily. Arrows and dots are buttons with labels, slides are announced as slides, and autoplay respects "reduced motion".

= Gutenslider Pro =

Pro adds more ways to design the same block: [see what Pro adds](https://gutenslider.org/gutenslider-pro-pricing/)

* 3D transitions: coverflow, cards and cube.
* Six shaped effects (morph, parallax, tilt, fan, stack, reveal) and twenty WebGL transitions (liquid, ripple, swirl, fluted glass and more).
* Scroll parallax for the backgrounds.
* Arrows that follow the pointer.
* Pagination as a few dots at a time, numbers or a progress bar, in the corners too; animated dot styles (pill, lines with progress).
* A lightbox zoom button: a full view where the photo fills the window, then zooms in where you click.
* YouTube playlists up to 100 videos (from the playlist page), and Shorts recognized from any link.
* More video sources for "Add videos": YouTube channels (@handle, up to 100 of the latest uploads), Vimeo (videos, unlisted ones too, users, channels, showcases), Dailymotion (videos, users, playlists) and TikTok (video links, several at once; TikTok profiles cannot be read), with their players.

= Source code =

The JavaScript and CSS in `build/` are compiled from the human-readable sources in `src/`, which ship with the plugin, together with the build setup (`package.json`, `package-lock.json`, `webpack.config.js`). To rebuild them: `npm ci && npm run build` (uses @wordpress/scripts).

= Open source libraries =

* [Swiper](https://swiperjs.com/) 14.3.0 (MIT) for the slide transitions, bundled from npm; source: [github.com/nolimits4web/swiper](https://github.com/nolimits4web/swiper).
* [Freemius SDK](https://github.com/Freemius/wordpress-sdk) (GPL) for Pro licenses.

== External services ==

The free plugin makes no requests to other servers on its own: no tracking, no remote fonts or scripts, and nothing is sent from your site unless you allow it on the opt-in screen (see Freemius below). Slide images and videos come from your own Media Library; only video slides from links, which you add yourself, contact the video's platform (see below). On the page, a platform's player loads only when its slide is shown or its play button is clicked; from then on that platform receives the visitor's IP address and browser data, as with any embedded video. Pages without such slides contact nothing.

**Freemius (opt-in, and licensing for Gutenslider Pro).** Gutenslider includes the Freemius SDK. After you activate the plugin, it asks once whether you want to opt in. Only if you click "Allow & Continue", your WordPress user's name and email address, the site's address and title, the WordPress, PHP and plugin versions, the site language, and whether the plugin is active or uninstalled are sent to Freemius, so we can tell you about security and feature updates; the list of your plugins and themes and the newsletter are separate choices on that screen. "Skip" sends nothing, and you can opt in or out later with the link in the plugin's row on the Plugins screen. If you buy Gutenslider Pro or activate a Pro license, your license key, site address, and the WordPress, PHP and plugin versions are sent to Freemius to check the license and deliver updates. [Terms](https://freemius.com/terms/), [Privacy](https://freemius.com/privacy/)

**YouTube (only for YouTube slides).** When you add YouTube links in the editor, your site asks YouTube for the video titles and sizes (youtube.com/oembed), reads the newest videos of a playlist from its public feed (youtube.com/feeds/videos.xml), and saves the video thumbnails (i.ytimg.com) to your Media Library. With Pro, playlists and channels are read from their pages (youtube.com/playlist, the channel page), and youtube.com/shorts/… tells which videos are Shorts. On the page, a YouTube slide without a saved thumbnail shows YouTube's thumbnail from i.ytimg.com, and the player is loaded from youtube-nocookie.com when the slide is shown or played. [Terms](https://www.youtube.com/t/terms), [Privacy](https://policies.google.com/privacy)

**Vimeo (only for Vimeo slides).** When you add Vimeo links in the editor (Pro), your site asks Vimeo for the video titles, sizes and thumbnails (vimeo.com/api/oembed.json), reads the video list of a user, channel or showcase from its public feed (vimeo.com/…/rss), and saves the thumbnails (i.vimeocdn.com) to your Media Library. On the page, the Vimeo player is loaded from player.vimeo.com, with "do not track" (dnt=1). [Terms](https://vimeo.com/terms), [Privacy](https://vimeo.com/privacy)

**Dailymotion (only for Dailymotion slides).** When you add Dailymotion links in the editor (Pro), your site asks Dailymotion's public API (api.dailymotion.com) for the videos' titles, sizes and thumbnails, and the video list of a user or playlist, and saves the thumbnails (dmcdn.net) to your Media Library. On the page, the Dailymotion player is loaded from geo.dailymotion.com. [Terms](https://legal.dailymotion.com/en/terms-of-use/), [Privacy](https://legal.dailymotion.com/en/privacy-policy/)

**TikTok (only for TikTok slides).** When you add TikTok video links in the editor (Pro), your site asks TikTok for the video's title and thumbnail (tiktok.com/oembed) and saves the thumbnail (tiktokcdn.com) to your Media Library. On the page, TikTok's embed player is loaded from tiktok.com/player. [Terms](https://www.tiktok.com/legal/terms-of-service), [Privacy](https://www.tiktok.com/legal/privacy-policy)

**Video files from links.** A slide can play a video file from another site; your site checks the link's type once (a HEAD request) when you add it, and visitors' browsers load the file from that site.

== Installation ==

1. In the admin, go to Plugins → Add New, search for "Gutenslider", then click Install and Activate.
2. Open a post or page in the block editor and add a **Gutenslider** block.
3. Pick images or videos for the slides, then add blocks on top.

To install by hand, upload the `gutenslider` folder to `/wp-content/plugins/` and activate the plugin on the Plugins screen.

== Frequently Asked Questions ==

= Which blocks can I put on a slide? =

Any block. Headings, paragraphs, buttons and columns are the most common. If a block from another plugin needs extra styling on a slide, ask in the [support forum](https://wordpress.org/support/plugin/gutenslider/).

= Does it work with my theme? =

Yes. Gutenslider works with block themes and classic themes that use the block editor. The content on a slide uses your theme's fonts, colors and spacing.

= I used Gutenslider 6. Do my sliders still work? =

Yes. Sliders made with 5.x and 6.x keep their settings and class names, so your custom CSS keeps matching. The lightbox now uses a native dialog; nothing needs to be changed.

= Is Gutenslider free? =

Yes. Everything listed under Features is free, with no limits and no license. Gutenslider Pro is a separate plugin that adds the features listed under Gutenslider Pro.

= Can I have Gutenslider in my language? =

You can help translate Gutenslider at [translate.wordpress.org](https://translate.wordpress.org/projects/wp-plugins/gutenslider/). Accepted translations are delivered to every site automatically.

== Screenshots ==

1. A full-width slider with a heading, text and a button on each slide.
2. The Gutenslider block in the editor with its settings.
3. A carousel with three slides in view.

== Changelog ==

= 7.3.3 =
_2026-10-28_

* Fix: background images set to "cover" are sharp on phones and in tall or full-screen sliders. The browser now loads a file as wide as the image is drawn, not one as wide as the slide.
* Fix: the arrows, dots and slider announcements for screen readers are in the site's language (they were always English).
* Fix: "Random order" with optimizers that combine and defer inline scripts (LiteSpeed Cache): no error in the browser console, and the order is still random.
* Missing translations added for the strings new in 7.3.2.

= 7.3.2 =
_2026-10-26_

* The plugin page on wordpress.org has a Live Preview: try Gutenslider in WordPress Playground, with a demo page of sliders, before you install it.
* New in Pro: vertical sliders. "Vertical" in the Motion panel moves the slides up and down, at the slider's height (with the Slide, Fade and Flip effects).

= 7.3.1 =
_2026-10-25_

* Fix: the divider color picker follows the pointer while dragging (it jumped back and forth); divider colors can be partly transparent now.
* Fix: arrows that follow the pointer (Pro) with the lightbox on: the left and right thirds turn the slide, the middle third opens the lightbox (one click did both).

= 7.3.0 =
_2026-10-25_

* After activation, Gutenslider asks once whether you want to opt in to update and security emails through Freemius; nothing is sent unless you allow it, and "Skip" keeps it that way.
* The plugin directory lists the Slide block again, next to Gutenslider.

= 7.2.2 =
_2026-10-22_

* Now free: the flip effect, transition time and time per slide, arrow positions, offsets, spacing and blend mode, dot positions and offset, divider height and invert, lightbox thumbnails, heading and text, the fade opening and lightbox colors, and blend modes and opacity for the slide content.
* Gutenslider Pro's features are in Pro's own code only: coverflow, cards and cube, the shaped and WebGL effects, numbers, progress bar and a few dots at a time, the pill and line dots, scroll parallax, arrows that follow the pointer, the lightbox zoom and the Vimeo, Dailymotion and TikTok players. The free plugin does not check for a license anywhere.
* The free plugin reads YouTube playlists from their public feed (the newest 15 videos) and tells Shorts apart by the feed; Pro reads the playlist page (up to 100) and finds Shorts from any link.
* A slide whose video comes from a platform without a player here shows its poster.
* Fix: a slider with a spacing preset as block gap no longer needs PHP 8 (works on PHP 7.4 again).
* Updated Swiper to 14.3.0; build/ no longer keeps chunks from earlier builds.
* The plugin ships its build setup (package.json, package-lock.json, webpack.config.js) next to the sources in src/.

= 7.2.1 =
_2026-10-12_

* Updated the Freemius SDK to 2.13.5.

= 7.2.0 =
_2026-10-05_

* New: "Content width" (Slides panel): Wide or Content lines the slides' blocks up with the theme's wide or content width, like the header and the page's text, while the background stays full width. Per slide and "Same on all" alike.
* In the editor the first click on a slider selects the slider, not the slide or block under the pointer; the next click reaches them.
* Fix: photos chosen in the Media Library or uploaded in a new slider become image slides again; since 7.1.0 they turned into empty video slides.
* Fix: in a looped slider with few slides, the copies the loop shows after the last slide take clicks again: the lightbox (with the right photo), links and the video player's controls.
* Fix: arrows that follow the pointer (Pro) show again; the cursor was hidden and no arrow appeared.
* Fix: when YouTube briefly fails to send a playlist page, the newest 15 videos from its feed are kept for 10 minutes instead of an hour, then the whole list is read again.

= 7.1.0 =
_2026-09-28_

* New: video slides from links ("Add videos"): YouTube videos and playlists and links to video files; with Pro YouTube channels, Vimeo, Dailymotion and TikTok. How many videos per playlist or channel, in which order, with or without Shorts; the thumbnails are saved to the Media Library once. The player loads for the slide on screen only and pauses when the slide leaves; the slider's autoplay waits for a playing video.
* New: "Play videos when their slide shows" for the whole slider (a slide can set its own), and one sound for all videos of a slider: mute or set the volume in one, the others follow.
* New: on small screens the arrows and dots fade over a playing video, clear of the player's controls, and come back on touch, pointer movement or keyboard focus.
* New: "Link images to the file" (Advanced), for lightbox plugins that open linked images; slides with their own link keep it.
* New: the lightbox also opens Image and Video blocks on slides (image next to text), in slide order with the backgrounds; the zoom cursor shows only on what opens.
* New: the slide's blocks can sit below or above the image instead of on it (Slides panel); the image keeps the minimum height, arrows and dots stay on it. Pro: arrows next to the blocks.
* New: random order (Motion): the slides are shuffled on each visit, also on cached pages, before they show, so the first slide is not swapped.
* New: an arrow style with text labels, "Previous" and "Next", in the site's font and the arrow colors.
* Lightbox zoom (Pro) opens a full view: the photo fills the window by width or height, the other controls hide, a click zooms in there, Escape goes back.
* Fix: replacing a slide's image in the editor shows the new image, not the next slide.
* Fix: "Width from content" works with loop, and on one device only (e.g. auto on phones, three per view on desktops) without a layout shift.
* Fix: dots at the side are centered and clear of side arrows; dots on the right and the progress bar sit at the right; the fraction is centered.
* Fix: arrows next to the blocks stay readable on light backgrounds; text arrows get a soft shadow on photos.

= 7.0.0 =
_2026-09-28_

* Front end rebuilt on the Interactivity API (view script module); no jQuery.
* Swiper 14, loaded when a slider comes near the viewport, with only the modules the slider uses.
* The lightbox is a native `<dialog>` (keyboard, swipe, focus return, captions, thumbnails); lightGallery was removed.
* Parallax uses CSS instead of simple-parallax-js.
* No layout shift: the slider's height and layout are rendered on the server before the script runs.
* Responsive image sizes per breakpoint; the first visible image loads with high priority, the rest lazily.
* Every value in the block markup is escaped; colors and units are validated.
* Both blocks are registered from block.json (apiVersion 3, works in the iframed editor).
* Freemius SDK 2.13, installed with Composer, in anonymous mode with no admin notices or menu pages.
* Removed: the five-star review link on the Plugins screen, the trial offer, and the old admin page.
* Readme: new name and description, External services and Source code sections.
* Requires WordPress 6.6 and PHP 7.4.

= 6.1.2 =
* Fix arrow formatting when arrows are disabled.
* Fix chunk names that confused caching plugins.








