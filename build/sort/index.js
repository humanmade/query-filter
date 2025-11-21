( function ( blocks, blockEditor, components, element, i18n ) {
	const { registerBlockType } = blocks;
	const { InspectorControls, useBlockProps } = blockEditor;
	const {
		PanelBody,
		TextControl,
		ToggleControl,
		CheckboxControl,
	} = components;
	const { Fragment, createElement: el } = element;
	const { __ } = i18n;

	const SORT_OPTIONS = [
		{
			key: 'date_desc',
			label: __( 'Newest to Oldest', 'query-filter' ),
			orderby: 'date',
			order: 'DESC',
		},
		{
			key: 'date_asc',
			label: __( 'Oldest to Newest', 'query-filter' ),
			orderby: 'date',
			order: 'ASC',
		},
		{
			key: 'title_asc',
			label: __( 'A → Z', 'query-filter' ),
			orderby: 'title',
			order: 'ASC',
		},
		{
			key: 'title_desc',
			label: __( 'Z → A', 'query-filter' ),
			orderby: 'title',
			order: 'DESC',
		},
		{
			key: 'comment_desc',
			label: __( 'Most Commented', 'query-filter' ),
			orderby: 'comment_count',
			order: 'DESC',
		},
		{
			key: 'menu_order',
			label: __( 'Menu Order', 'query-filter' ),
			orderby: 'menu_order',
			order: 'ASC',
		},
	];

	const DEFAULT_OPTIONS = SORT_OPTIONS.reduce( ( acc, option ) => {
		acc[ option.key ] = true;
		return acc;
	}, {} );

	registerBlockType( 'query-filter/sort', {
		edit( { attributes, setAttributes } ) {
			const { label, showLabel = true, options = {} } = attributes;

			const resolvedOptions = {
				...DEFAULT_OPTIONS,
				...options,
			};

			const enabledOptions = SORT_OPTIONS.filter(
				( option ) => resolvedOptions[ option.key ]
			);

			return el(
				Fragment,
				null,
				el(
					InspectorControls,
					null,
					el(
						PanelBody,
						{ title: __( 'Sort Settings', 'query-filter' ) },
						el( TextControl, {
							label: __( 'Label', 'query-filter' ),
							value: label,
							help: __(
								'If empty then no label will be shown',
								'query-filter'
							),
							onChange: ( next ) =>
								setAttributes( { label: next } ),
						} ),
						el( ToggleControl, {
							label: __( 'Show Label', 'query-filter' ),
							checked: showLabel,
							onChange: ( next ) =>
								setAttributes( { showLabel: next } ),
						} ),
						el(
							'div',
							{ className: 'wp-block-query-filter-sort__options' },
							SORT_OPTIONS.map( ( option ) =>
								el( CheckboxControl, {
									key: option.key,
									label: option.label,
									checked: resolvedOptions[ option.key ],
									onChange: ( next ) =>
										setAttributes( {
											options: {
												...resolvedOptions,
												[ option.key ]: next,
											},
										} ),
								} )
							)
						)
					)
				),
				el(
					'div',
					useBlockProps( { className: 'wp-block-query-filter' } ),
					showLabel &&
						el(
							'label',
							{
								className:
									'wp-block-query-filter-sort__label wp-block-query-filter__label',
							},
							label || __( 'Order Results', 'query-filter' )
						),
					el(
						'select',
						{
							className:
								'wp-block-query-filter-sort__select wp-block-query-filter__select',
							disabled: true,
						},
						enabledOptions.map( ( option ) =>
							el(
								'option',
								{
									key: option.key,
								},
								option.label
							)
						)
					)
				)
			);
		},
	} );
} )(
	window.wp.blocks,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.element,
	window.wp.i18n
);

