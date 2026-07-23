import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	FormTokenField,
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
		includeTerms,
		excludeTerms,
		maxVisibleTerms,
		showAllLabel,
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
					per_page: 100,
				} ) || []
			);
		},
		[ taxonomy ]
	);

	// Term selection is stored as slugs, but presented to editors as names.
	const termNames = terms.map( ( term ) => term.name );
	const slugsToNames = ( slugs ) =>
		slugs
			.map(
				( slug ) => terms.find( ( term ) => term.slug === slug )?.name
			)
			.filter( Boolean );
	const namesToSlugs = ( names ) =>
		names
			.map(
				( name ) => terms.find( ( term ) => term.name === name )?.slug
			)
			.filter( Boolean );

	const isCurated = includeTerms.length > 0;

	// The preview mirrors what the front end will render, so an editor can see
	// the effect of curation and ordering without leaving the canvas.
	const previewTerms = isCurated
		? includeTerms
				.map( ( slug ) => terms.find( ( term ) => term.slug === slug ) )
				.filter( Boolean )
		: terms.filter( ( term ) => ! excludeTerms.includes( term.slug ) );

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
						onChange={ ( nextDisplayType ) => {
							if ( nextDisplayType === 'select' ) {
								setAttributes( {
									displayType: nextDisplayType,
									layoutDirection: undefined,
								} );
							} else {
								setAttributes( {
									displayType: nextDisplayType,
								} );
							}
						} }
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
				<PanelBody
					title={ __( 'Terms', 'query-filter' ) }
					initialOpen={ false }
				>
					<FormTokenField
						label={ __(
							'Include only these terms',
							'query-filter'
						) }
						value={ slugsToNames( includeTerms ) }
						suggestions={ termNames }
						onChange={ ( names ) =>
							setAttributes( {
								includeTerms: namesToSlugs( names ),
							} )
						}
						help={ __(
							'Leave empty to show every term with posts. When set, only these terms appear, in the order listed.',
							'query-filter'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ ! isCurated && (
						<FormTokenField
							label={ __(
								'Exclude these terms',
								'query-filter'
							) }
							value={ slugsToNames( excludeTerms ) }
							suggestions={ termNames }
							onChange={ ( names ) =>
								setAttributes( {
									excludeTerms: namesToSlugs( names ),
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<TextControl
						label={ __(
							'Terms shown before "show all"',
							'query-filter'
						) }
						type="number"
						min={ 0 }
						value={ maxVisibleTerms }
						onChange={ ( value ) =>
							setAttributes( {
								maxVisibleTerms: parseInt( value, 10 ) || 0,
							} )
						}
						help={ __(
							'Set to 0 to show all terms with no toggle.',
							'query-filter'
						) }
					/>
					{ maxVisibleTerms > 0 && (
						<TextControl
							label={ __( 'Show all label', 'query-filter' ) }
							value={ showAllLabel }
							placeholder={ __( 'See all', 'query-filter' ) }
							onChange={ ( value ) =>
								setAttributes( { showAllLabel: value } )
							}
						/>
					) }
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
						{ previewTerms.map( ( term ) => (
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
						{ previewTerms.map( ( term ) => (
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
						{ previewTerms.map( ( term ) => (
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
