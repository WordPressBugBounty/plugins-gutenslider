/**
 * Shared sidebar controls: the device switcher (synced with the editor's
 * preview device), per-device fields, and a picker for arrow, divider and
 * dot styles.
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	BaseControl,
	Button,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControl as ToggleGroupControl,
	// eslint-disable-next-line @wordpress/no-unsafe-wp-apis
	__experimentalToggleGroupControlOptionIcon as ToggleGroupControlOptionIcon,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { desktop, tablet, mobile } from '@wordpress/icons';

/** Attribute suffix per editor device, as 6.x named them. */
export const DEVICES = [
	{
		value: 'Desktop',
		suffix: '',
		icon: desktop,
		label: __( 'Desktop', 'gutenslider' ),
	},
	{
		value: 'Tablet',
		suffix: 'Md',
		icon: tablet,
		label: __( 'Tablet', 'gutenslider' ),
	},
	{
		value: 'Mobile',
		suffix: 'Sm',
		icon: mobile,
		label: __( 'Mobile', 'gutenslider' ),
	},
];

/**
 * The editor's preview device, with its setter; local state where there is
 * no preview device (widgets editor).
 *
 * @return {Array} [ device, setDevice ].
 */
export function useDevice() {
	const [ local, setLocal ] = useState( 'Desktop' );
	const editorDevice = useSelect(
		( select ) => select( 'core/editor' )?.getDeviceType?.(),
		[]
	);
	const { setDeviceType } = useDispatch( 'core/editor' ) ?? {};
	const value = editorDevice && setDeviceType ? editorDevice : local;
	return [
		DEVICES.find( ( d ) => d.value === value ) ?? DEVICES[ 0 ],
		editorDevice && setDeviceType ? setDeviceType : setLocal,
	];
}

/**
 * Desktop / tablet / mobile switch. Also switches the editor's preview.
 *
 * @param {Object}   props
 * @param {Object}   props.device   Current device.
 * @param {Function} props.onChange Setter.
 */
export function DeviceSwitch( { device, onChange } ) {
	return (
		<ToggleGroupControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			isBlock
			className="gutenslider-device-switch"
			label={ __( 'Device', 'gutenslider' ) }
			help={ __(
				'Settings marked with a device apply to the device selected here.',
				'gutenslider'
			) }
			value={ device.value }
			onChange={ onChange }
		>
			{ DEVICES.map( ( d ) => (
				<ToggleGroupControlOptionIcon
					key={ d.value }
					value={ d.value }
					icon={ d.icon }
					label={ d.label }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

/**
 * A label with the device it applies to, e.g. "Slides per view (Tablet)".
 *
 * @param {string} label  Setting name.
 * @param {Object} device Device.
 * @return {string} Label.
 */
export const perDevice = ( label, device ) =>
	/* translators: 1: setting name, 2: device name, like "Tablet" */
	sprintf( __( '%1$s (%2$s)', 'gutenslider' ), label, device.label );

/**
 * A grid of pressable previews (arrow styles, dividers, dot styles).
 *
 * @param {Object}   props
 * @param {string}   props.label    Label.
 * @param {Object[]} props.options  { value, label, preview } (preview: element).
 * @param {string}   props.value    Current value.
 * @param {Function} props.onChange Setter.
 * @param {number}   props.columns  Columns.
 */
export function StylePicker( {
	label,
	options,
	value,
	onChange,
	columns = 4,
} ) {
	return (
		<BaseControl __nextHasNoMarginBottom label={ label } id={ undefined }>
			<div
				className="gutenslider-style-picker"
				role="radiogroup"
				aria-label={ label }
				style={ { '--columns': columns } }
			>
				{ options.map( ( option ) => (
					<Button
						key={ option.value }
						role="radio"
						aria-checked={ value === option.value }
						isPressed={ value === option.value }
						label={ option.label }
						showTooltip
						onClick={ () => onChange( option.value ) }
					>
						{ option.preview }
					</Button>
				) ) }
			</div>
		</BaseControl>
	);
}

/**
 * Trusted SVG from the server (includes/svg.php, filtered there).
 *
 * @param {Object} props
 * @param {string} props.svg       Markup.
 * @param {string} props.className Class.
 */
export function Svg( { svg, className } ) {
	return (
		<span
			className={ className }
			aria-hidden="true"
			dangerouslySetInnerHTML={ { __html: svg || '' } }
		/>
	);
}
