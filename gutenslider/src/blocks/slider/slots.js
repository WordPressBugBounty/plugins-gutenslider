/**
 * Where other plugins add controls to the block sidebars:
 * - `gutenslider.<slot>` filters (e.g. `gutenslider.slider.motion`) get an
 *   array and the block's props, and return the elements to append;
 * - option filters (e.g. `gutenslider.effects`) extend a select's options.
 */
import { applyFilters } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Elements added at this place.
 *
 * @param {string} name  Slot, without the `gutenslider.` prefix.
 * @param {Object} props Block props (and extras the slot documents).
 * @return {Element[]} Elements.
 */
export const slot = ( name, props ) =>
	applyFilters( `gutenslider.${ name }`, [], props );

/**
 * A select's options, as extended. A saved value the options lack stays
 * listed, so the select shows what the block has.
 *
 * @param {string}   name    Filter, without the `gutenslider.` prefix.
 * @param {Object[]} options Free options.
 * @param {string}   value   Current value.
 * @return {Object[]} Options.
 */
export function slotOptions( name, options, value ) {
	const all = applyFilters( `gutenslider.${ name }`, options );
	return value && ! all.some( ( option ) => option.value === value )
		? [
				...all,
				{
					value,
					label: sprintf(
						/* translators: %s: a saved setting value */
						__( '%s (saved value)', 'gutenslider' ),
						value
					),
				},
			]
		: all;
}
