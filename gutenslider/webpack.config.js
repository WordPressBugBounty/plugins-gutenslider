/**
 * The default wp-scripts setup (blocks from src/blocks/*\/block.json, the
 * view script as a module), plus:
 * - chunks with content hashes in build/chunks/ (the editor's own under
 *   build/chunks/editor-*: its Preview loads Swiper on demand).
 * - `swiper-modules/*`: Swiper's module files one by one, so the view script
 *   loads each module a slider uses as its own small chunk (Swiper's package
 *   only exports them all together).
 * - the entries in src/pro/webpack.js, when it is there (Pro build only).
 */
const fs = require( 'fs' );
const path = require( 'path' );
const [ scriptConfig, moduleConfig ] = require( '@wordpress/scripts/config/webpack.config' );

const PRO = path.resolve( __dirname, 'src/pro/webpack.js' );
const extra = fs.existsSync( PRO ) ? require( PRO ) : { scripts: {}, modules: {} };
const alias = {
	'swiper-modules': path.resolve( __dirname, 'node_modules/swiper/modules' ),
};
const withEntry = ( config, extra ) => ( {
	...config,
	entry: async () => ( { ...( typeof config.entry === 'function' ? await config.entry() : config.entry ), ...extra } ),
} );

module.exports = [
	withEntry(
		{
			...scriptConfig,
			resolve: { ...scriptConfig.resolve, alias: { ...scriptConfig.resolve?.alias, ...alias } },
			// The Preview's chunks.
			output: { ...scriptConfig.output, chunkFilename: 'chunks/editor-[name].[contenthash:8].js' },
			// No shared vendor chunks: build/pro/ code must not end up in one
			// outside it. (wp-scripts' own groups extract the block styles.)
			optimization: {
				...scriptConfig.optimization,
				splitChunks: {
					...scriptConfig.optimization.splitChunks,
					cacheGroups: { ...scriptConfig.optimization.splitChunks.cacheGroups, defaultVendors: false },
				},
			},
		},
		extra.scripts
	),
	withEntry( {
		...moduleConfig,
		resolve: { ...moduleConfig.resolve, alias: { ...moduleConfig.resolve?.alias, ...alias } },
		// Content hashes: the ?ver= WordPress adds to view.js does not reach
		// the chunks it imports, so a new release needs new chunk names.
		output: { ...moduleConfig.output, chunkFilename: 'chunks/[name].[contenthash:8].js' },
		// One request per named chunk: no extra shared chunks next to them.
		optimization: { ...moduleConfig.optimization, splitChunks: false },
	}, extra.modules ),
];
