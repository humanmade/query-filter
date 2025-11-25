( function ( wp ) {
	const { __ } = wp.i18n;
	const { registerBlockType } = wp.blocks;
	const { registerFormatType, toggleFormat, insert } = wp.richText;
	const {
		InspectorControls,
		RichTextToolbarButton,
		useBlockProps,
	} = wp.blockEditor;
	const {
		Button,
		Flex,
		FlexItem,
		Modal,
		PanelBody,
		SelectControl,
		TextControl,
	} = wp.components;
	const { Fragment, useEffect, useMemo, useState, createElement: el } =
		wp.element;
	const { SVG, Path } = wp.primitives;

	const FILTER_OPTIONS = [
		{ label: __( 'Tag', 'query-filter' ), value: 'tag' },
		{ label: __( 'Category', 'query-filter' ), value: 'category' },
		{ label: __( 'Sort', 'query-filter' ), value: 'sort' },
	];

	const BLOCK_NAME = 'query-filter/taxonomy-text';
	const FORMAT_NAME = 'query-filter/taxonomy-inline-text';
	const ATTRIBUTE_KEY = 'data-query-filter-text';
	const PLACEHOLDER_TEXT = __( 'taxonomy', 'query-filter' );

	const ICON = el(
		SVG,
		{ viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' },
		el( Path, {
			d: 'M17.5 4v5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V4H8v5a.5.5 0 0 0 .5.5h7A.5.5 0 0 0 16 9V4h1.5Zm0 16v-5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v5H8v-5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v5h1.5Z',
		} )
	);

	const parseSettings = ( value ) => {
		if ( ! value ) {
			return { filterType: 'tag', prefix: '', suffix: '' };
		}

		try {
			const parsed = JSON.parse( value );

			return {
				filterType: parsed.filterType || 'tag',
				prefix: parsed.prefix || '',
				suffix: parsed.suffix || '',
			};
		} catch ( error ) {
			return { filterType: 'tag', prefix: '', suffix: '' };
		}
	};

	const FormatEdit = ( {
		value,
		onChange,
		isActive,
		activeAttributes,
	} ) => {
		const currentSettings = useMemo(
			() => parseSettings( activeAttributes?.[ ATTRIBUTE_KEY ] ),
			[ activeAttributes?.[ ATTRIBUTE_KEY ] ]
		);
		const [ isOpen, setIsOpen ] = useState( false );
		const [ settings, setSettings ] = useState( currentSettings );

		useEffect( () => {
			setSettings( currentSettings );
		}, [ currentSettings ] );

		const applyFormat = () => {
			const attributes = {
				[ ATTRIBUTE_KEY ]: JSON.stringify( settings ),
			};
			const selectionCollapsed = value.start === value.end;
			let nextValue = value;

			if ( selectionCollapsed ) {
				nextValue = insert( nextValue, PLACEHOLDER_TEXT );
				const end = nextValue.start;
				const start = end - PLACEHOLDER_TEXT.length;
				nextValue = { ...nextValue, start, end };
			}

			onChange(
				toggleFormat( nextValue, {
					type: FORMAT_NAME,
					attributes,
				} )
			);
			setIsOpen( false );
		};

		const removeFormat = () => {
			onChange( toggleFormat( value, { type: FORMAT_NAME } ) );
			setIsOpen( false );
		};

		return el(
			Fragment,
			null,
			el( RichTextToolbarButton, {
				icon: ICON,
				title: __( 'Taxonomy Text', 'query-filter' ),
				onClick: () => setIsOpen( true ),
				isActive,
			} ),
			isOpen &&
				el(
					Modal,
					{
						title: __( 'Dynamic Taxonomy Text', 'query-filter' ),
						onRequestClose: () => setIsOpen( false ),
					},
					el( SelectControl, {
						label: __( 'Filter Source', 'query-filter' ),
						value: settings.filterType,
						options: FILTER_OPTIONS,
						onChange: ( filterType ) =>
							setSettings( ( prev ) => ( {
								...prev,
								filterType,
							} ) ),
					} ),
					el( TextControl, {
						label: __( 'Prefix Text', 'query-filter' ),
						value: settings.prefix,
						onChange: ( prefix ) =>
							setSettings( ( prev ) => ( {
								...prev,
								prefix,
							} ) ),
					} ),
					el( TextControl, {
						label: __( 'Suffix Text', 'query-filter' ),
						value: settings.suffix,
						onChange: ( suffix ) =>
							setSettings( ( prev ) => ( {
								...prev,
								suffix,
							} ) ),
					} ),
					el(
						Flex,
						{ justify: 'flex-start' },
						el(
							FlexItem,
							null,
							el(
								Button,
								{ variant: 'primary', onClick: applyFormat },
								__( 'Apply', 'query-filter' )
							)
						),
						isActive &&
							el(
								FlexItem,
								null,
								el(
									Button,
									{ variant: 'tertiary', onClick: removeFormat },
									__( 'Remove', 'query-filter' )
								)
							)
					)
				)
		);
	};

	const BlockEdit = ( { attributes, setAttributes } ) => {
		const { filterType = 'tag', prefix = '', suffix = '' } = attributes;
		const blockProps = useBlockProps( {
			className: `taxonomy-text taxonomy-text--${ filterType }`,
		} );
		const previewValue =
			filterType === 'sort'
				? __( 'Selected Sort', 'query-filter' )
				: __( 'Selected Term', 'query-filter' );

		return el(
			Fragment,
			null,
			el(
				InspectorControls,
				null,
				el(
					PanelBody,
					{ title: __( 'Display Settings', 'query-filter' ) },
					el( SelectControl, {
						label: __( 'Filter Source', 'query-filter' ),
						value: filterType,
						options: FILTER_OPTIONS,
						onChange: ( nextFilter ) =>
							setAttributes( { filterType: nextFilter } ),
					} ),
					el( TextControl, {
						label: __( 'Prefix Text', 'query-filter' ),
						value: prefix,
						onChange: ( value ) =>
							setAttributes( { prefix: value } ),
						placeholder: __( 'e.g. Showing results for ', 'query-filter' ),
					} ),
					el( TextControl, {
						label: __( 'Suffix Text', 'query-filter' ),
						value: suffix,
						onChange: ( value ) =>
							setAttributes( { suffix: value } ),
						placeholder: __( 'e.g. only', 'query-filter' ),
					} )
				)
			),
			el(
				'span',
				{ ...blockProps },
				`${ prefix || '' }${ previewValue }${ suffix || '' }`
			)
		);
	};

	registerFormatType( FORMAT_NAME, {
		title: __( 'Taxonomy Text', 'query-filter' ),
		tagName: 'span',
		className: 'taxonomy-text-inline',
		attributes: {
			[ ATTRIBUTE_KEY ]: ATTRIBUTE_KEY,
		},
		edit: FormatEdit,
	} );

	registerBlockType( BLOCK_NAME, {
		edit: BlockEdit,
	} );
} )( window.wp );

