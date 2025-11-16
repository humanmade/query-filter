import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

export default function Edit( { attributes, setAttributes, context } ) {
	const { emptyLabel, label, showLabel, displayType, layoutDirection } =
		attributes;

	const allPostTypes = useSelect( ( select ) => {
		return (
			( select( 'core' ).getPostTypes( { per_page: 100 } ) || [] ).filter(
				( type ) => type.viewable
			) || []
		);
	}, [] );

	let contextPostTypes = ( context.query.postType || '' )
		.split( ',' )
		.map( ( type ) => type.trim() );

	// Support for enhanced query loop block plugin.
	if ( Array.isArray( context.query.multiple_posts ) ) {
		contextPostTypes = contextPostTypes.concat(
			context.query.multiple_posts
		);
	}

	const postTypes = contextPostTypes.map( ( postType ) => {
		return (
			allPostTypes.find( ( type ) => type.slug === postType ) || {
				slug: postType,
				name: postType,
			}
		);
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Post Type Settings', 'query-filter' ) }>
					<SelectControl
						label={ __( 'Display Type', 'query-filter' ) }
						value={ displayType }
						options={ [
							{
								label: __(
									'Select (Dropdown)',
									'query-filter'
								),
								value: 'select',
							},
							{
								label: __(
									'Radio (Single Choice)',
									'query-filter'
								),
								value: 'radio',
							},
							{
								label: __(
									'Checkbox (Multiple Choice)',
									'query-filter'
								),
								value: 'checkbox',
							},
						] }
						onChange={ ( displayType ) =>
							setAttributes( { displayType } )
						}
					/>
					{ ( displayType === 'radio' ||
						displayType === 'checkbox' ) && (
						<ToggleGroupControl
							label={ __( 'Layout Direction', 'query-filter' ) }
							value={ layoutDirection }
							onChange={ ( layoutDirection ) =>
								setAttributes( { layoutDirection } )
							}
							isBlock
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						>
							<ToggleGroupControlOption
								value="vertical"
								label={ __( 'Vertical', 'query-filter' ) }
							/>
							<ToggleGroupControlOption
								value="horizontal"
								label={ __( 'Horizontal', 'query-filter' ) }
							/>
						</ToggleGroupControl>
					) }
					<TextControl
						label={ __( 'Label', 'query-filter' ) }
						value={ label }
						defaultValue={ __( 'Content Type', 'query-filter' ) }
						help={ __(
							'If empty then no label will be shown',
							'query-filter'
						) }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
					<ToggleControl
						label={ __( 'Show Label', 'query-filter' ) }
						checked={ showLabel }
						onChange={ ( showLabel ) =>
							setAttributes( { showLabel } )
						}
					/>
					<TextControl
						label={ __( 'Empty Choice Label', 'query-filter' ) }
						value={ emptyLabel }
						placeholder={ __( 'All', 'query-filter' ) }
						onChange={ ( emptyLabel ) =>
							setAttributes( { emptyLabel } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { className: 'wp-block-query-filter' } ) }>
				{ showLabel && (
					<label className="wp-block-query-filter-post-type__label wp-block-query-filter__label">
						{ label || __( 'Content Type', 'query-filter' ) }
					</label>
				) }
				{ displayType === 'select' && (
					<select
						className="wp-block-query-filter-post-type__select wp-block-query-filter__select"
						inert
					>
						<option>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</option>
						{ postTypes.map( ( type ) => (
							<option key={ type.slug }>{ type.name }</option>
						) ) }
					</select>
				) }
				{ displayType === 'radio' && (
					<div
						className={ `wp-block-query-filter-post-type__radio-group wp-block-query-filter__radio-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}` }
					>
						<label>
							<input
								type="radio"
								name="post-type-preview"
								defaultChecked
								inert
							/>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</label>
						{ postTypes.map( ( type ) => (
							<label key={ type.slug }>
								<input
									type="radio"
									name="post-type-preview"
									inert
								/>
								{ type.name }
							</label>
						) ) }
					</div>
				) }
				{ displayType === 'checkbox' && (
					<div
						className={ `wp-block-query-filter-post-type__checkbox-group wp-block-query-filter__checkbox-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}` }
					>
						{ postTypes.map( ( type ) => (
							<label key={ type.slug }>
								<input type="checkbox" inert />
								{ type.name }
							</label>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
