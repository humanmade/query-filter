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
		hierarchy,
		includeTerms,
		excludeTerms,
		maxVisibleTerms,
		hideEmpty,
		showCount,
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

	const isHierarchical = !! taxonomies?.find(
		( tax ) => tax.slug === taxonomy
	)?.hierarchical;

	// Mirror the server side fallbacks: a flat taxonomy has no tree to show,
	// and a select control has no rows to collapse.
	let hierarchyMode = isHierarchical ? hierarchy : 'flat';
	if ( hierarchyMode === 'collapsed' && displayType === 'select' ) {
		hierarchyMode = 'nested';
	}

	// Nest the preview terms by parent, promoting orphans to roots, in the
	// same way build_term_tree() does on the server.
	const buildTree = ( list ) => {
		const ids = list.map( ( term ) => term.id );
		const childrenOf = {};
		list.forEach( ( term ) => {
			const parent = ids.includes( term.parent ) ? term.parent : 0;
			childrenOf[ parent ] = [ ...( childrenOf[ parent ] || [] ), term ];
		} );
		const build = ( parent ) =>
			( childrenOf[ parent ] || [] ).map( ( term ) => ( {
				term,
				children: build( term.id ),
			} ) );
		return build( 0 );
	};

	const flattenTree = ( nodes, depth = 0 ) =>
		nodes.flatMap( ( node ) => [
			{ term: node.term, depth },
			...flattenTree( node.children, depth + 1 ),
		] );

	const previewTree =
		hierarchyMode === 'flat'
			? previewTerms.map( ( term ) => ( { term, children: [] } ) )
			: buildTree( previewTerms );

	const hierarchyOptions = [
		{ label: __( 'Flat list', 'query-filter' ), value: 'flat' },
		{ label: __( 'Nested', 'query-filter' ), value: 'nested' },
	];
	if ( displayType !== 'select' ) {
		hierarchyOptions.push( {
			label: __( 'Nested, children collapsed', 'query-filter' ),
			value: 'collapsed',
		} );
	}

	const renderPreviewBranch = ( nodes, depth ) => (
		<ul className="wp-block-query-filter__term-list" data-depth={ depth }>
			{ nodes.map( ( node ) => (
				<li
					key={ node.term.slug }
					className={ `wp-block-query-filter__term${
						node.children.length ? ' has-children' : ''
					}` }
				>
					<label>
						<input
							type={ displayType }
							name="taxonomy-preview"
							inert="true"
						/>
						{ node.term.name }
					</label>
					{ node.children.length > 0 &&
						hierarchyMode === 'collapsed' && (
							<button
								type="button"
								className="wp-block-query-filter__toggle-children"
								aria-expanded="true"
								inert="true"
							/>
						) }
					{ node.children.length > 0 &&
						renderPreviewBranch( node.children, depth + 1 ) }
				</li>
			) ) }
		</ul>
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
					{ isHierarchical && (
						<SelectControl
							label={ __( 'Hierarchy', 'query-filter' ) }
							value={ hierarchyMode }
							options={ hierarchyOptions }
							onChange={ ( value ) =>
								setAttributes( { hierarchy: value } )
							}
							help={ __(
								'Show child terms beneath their parents. Selecting a parent also matches posts in its children.',
								'query-filter'
							) }
						/>
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
					<ToggleControl
						label={ __( 'Hide terms with no results', 'query-filter' ) }
						checked={ hideEmpty }
						onChange={ ( value ) => setAttributes( { hideEmpty: value } ) }
						help={ __(
							'Leave out terms that no post in the current results has, taking the other filters and any search into account. Selected terms are always shown.',
							'query-filter'
						) }
					/>
					<ToggleControl
						label={ __( 'Show result counts', 'query-filter' ) }
						checked={ showCount }
						onChange={ ( value ) => setAttributes( { showCount: value } ) }
						help={ __(
							'Show how many results each term would add to the current results.',
							'query-filter'
						) }
					/>
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
						inert="true"
					>
						<option>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</option>
						{ flattenTree( previewTree ).map( ( { term, depth } ) => (
							<option key={ term.slug }>
								{ '— '.repeat( depth ) + term.name }
							</option>
						) ) }
					</select>
				) }
				{ displayType === 'radio' && (
					<div
						className={ `wp-block-query-filter-taxonomy__radio-group wp-block-query-filter__radio-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}${
							hierarchyMode !== 'flat'
								? ` is-hierarchy-${ hierarchyMode }`
								: ''
						}` }
					>
						<label>
							<input
								type="radio"
								name="taxonomy-preview"
								defaultChecked
								inert="true"
							/>
							{ emptyLabel || __( 'All', 'query-filter' ) }
						</label>
						{ hierarchyMode === 'flat' &&
							previewTerms.map( ( term ) => (
								<label key={ term.slug }>
									<input
										type="radio"
										name="taxonomy-preview"
										inert="true"
									/>
									{ term.name }
								</label>
							) ) }
						{ hierarchyMode !== 'flat' &&
							renderPreviewBranch( previewTree, 0 ) }
					</div>
				) }
				{ displayType === 'checkbox' && (
					<div
						className={ `wp-block-query-filter-taxonomy__checkbox-group wp-block-query-filter__checkbox-group${
							layoutDirection === 'horizontal'
								? ' horizontal'
								: ''
						}${
							hierarchyMode !== 'flat'
								? ` is-hierarchy-${ hierarchyMode }`
								: ''
						}` }
					>
						{ hierarchyMode === 'flat' &&
							previewTerms.map( ( term ) => (
								<label key={ term.slug }>
									<input type="checkbox" inert="true" />
									{ term.name }
								</label>
							) ) }
						{ hierarchyMode !== 'flat' &&
							renderPreviewBranch( previewTree, 0 ) }
					</div>
				) }
			</div>
		</>
	);
}
