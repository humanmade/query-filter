import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

export default function Edit( { attributes, setAttributes } ) {
	const {
		taxonomy,
		emptyLabel,
		label,
		showLabel,
		displayType,
		layoutDirection,
	} = attributes;

	const taxonomies = useSelect(
		( select ) => {
			const results = (
				select( 'core' ).getTaxonomies( { per_page: 100 } ) || []
			).filter( ( taxonomy ) => taxonomy.visibility.publicly_queryable );

			if ( results && results.length > 0 && ! taxonomy ) {
				setAttributes( {
					taxonomy: results[ 0 ].slug,
					label: results[ 0 ].name,
				} );
			}

			return results;
		},
		[ taxonomy ]
	);

	const terms = useSelect(
		( select ) => {
			return (
				select( 'core' ).getEntityRecords( 'taxonomy', taxonomy, {
					number: 50,
				} ) || []
			);
		},
		[ taxonomy ]
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Taxonomy Settings', 'query-filter' ) }>
					<SelectControl
						label={ __( 'Select Taxonomy', 'query-filter' ) }
						value={ taxonomy }
						options={ ( taxonomies || [] ).map( ( taxonomy ) => ( {
							label: taxonomy.name,
							value: taxonomy.slug,
						} ) ) }
						onChange={ ( taxonomy ) =>
							setAttributes( {
								taxonomy,
								label: taxonomies.find(
									( tax ) => tax.slug === taxonomy
								).name,
							} )
						}
					/>
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
					<label className="wp-block-query-filter-taxonomy__label wp-block-query-filter__label">
						{ label }
					</label>
				) }
				{ displayType === 'select' && (
					<select
						className="wp-block-query-filter-taxonomy__select wp-block-query-filter__select"
						inert
					>
						<option>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</option>
						{ terms.map( ( term ) => (
							<option key={ term.slug }>{ term.name }</option>
						) ) }
					</select>
				) }
				{ displayType === 'radio' && (
					<div
						className={ `wp-block-query-filter-taxonomy__radio-group wp-block-query-filter__radio-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}` }
					>
						<label>
							<input
								type="radio"
								name="taxonomy-preview"
								defaultChecked
								inert
							/>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</label>
						{ terms.map( ( term ) => (
							<label key={ term.slug }>
								<input
									type="radio"
									name="taxonomy-preview"
									inert
								/>
								{ term.name }
							</label>
						) ) }
					</div>
				) }
				{ displayType === 'checkbox' && (
					<div
						className={ `wp-block-query-filter-taxonomy__checkbox-group wp-block-query-filter__checkbox-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}` }
					>
						{ terms.map( ( term ) => (
							<label key={ term.slug }>
								<input type="checkbox" inert />
								{ term.name }
							</label>
						) ) }
					</div>
				) }
			</div>
		</>
	);
}
