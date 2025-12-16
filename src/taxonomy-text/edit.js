import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

const FILTER_OPTIONS = [
	{ label: __( 'Tag', 'query-filter' ), value: 'tag' },
	{ label: __( 'Category', 'query-filter' ), value: 'category' },
	{ label: __( 'Sort', 'query-filter' ), value: 'sort' },
	{ label: __( 'Page Number', 'query-filter' ), value: 'page' },
	{
		label: __( 'Yoast Primary Category', 'query-filter' ),
		value: 'yoast_primary_category',
	},
	{ label: __( 'Searched Term', 'query-filter' ), value: 'search' },
];

const VALUE_TYPE_OPTIONS = [
	{ label: __( 'Title', 'query-filter' ), value: 'title' },
	{ label: __( 'Description', 'query-filter' ), value: 'description' },
	{ label: __( 'Page Number', 'query-filter' ), value: 'page' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		filterType = 'tag',
		valueType = 'title',
		prefix = '',
		suffix = '',
		link = false,
		showAfterFirstPage = true,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `taxonomy-text taxonomy-text--${ filterType }`,
	} );

	const previewValue =
		filterType === 'sort'
			? __( 'Selected Sort', 'query-filter' )
			: filterType === 'search'
			? __( 'Searched Term', 'query-filter' )
			: valueType === 'description'
			? __( 'Selected Term Description', 'query-filter' )
			: __( 'Selected Term', 'query-filter' );

	const handleFilterChange = ( nextFilter ) => {
		setAttributes( {
			filterType: nextFilter,
			valueType:
				nextFilter === 'page'
					? 'page'
					: ( nextFilter === 'sort' || nextFilter === 'search' ) && valueType === 'description'
					? 'title'
					: valueType,
		} );
	};

	const valueTypeOptions =
		filterType === 'page'
			? VALUE_TYPE_OPTIONS.filter( ( option ) => option.value === 'page' )
			: filterType === 'sort' || filterType === 'search'
			? VALUE_TYPE_OPTIONS.filter( ( option ) => option.value === 'title' )
			: VALUE_TYPE_OPTIONS;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Display Settings', 'query-filter' ) }>
					<SelectControl
						label={ __( 'Filter Source', 'query-filter' ) }
						value={ filterType }
						options={ FILTER_OPTIONS }
						onChange={ handleFilterChange }
					/>
					{ [ 'tag', 'category', 'yoast_primary_category' ].includes(
						filterType
					) && (
						<ToggleControl
							label={ __(
								'Link to term archive',
								'query-filter'
							) }
							checked={ !! link }
							onChange={ ( value ) =>
								setAttributes( { link: value } )
							}
						/>
					) }
					{ filterType !== 'search' && (
						<SelectControl
							label={ __( 'Value Type', 'query-filter' ) }
							value={ valueType }
							options={ valueTypeOptions }
							disabled={ filterType === 'page' }
							onChange={ ( nextValue ) =>
								setAttributes( { valueType: nextValue } )
							}
						/>
					) }
					{ filterType === 'page' && (
						<ToggleControl
							label={ __(
								'Only show after page 1',
								'query-filter'
							) }
							checked={ !! showAfterFirstPage }
							onChange={ ( value ) =>
								setAttributes( { showAfterFirstPage: value } )
							}
						/>
					) }
					<TextControl
						label={ __( 'Prefix Text', 'query-filter' ) }
						value={ prefix }
						onChange={ ( value ) => setAttributes( { prefix: value } ) }
					placeholder=""
					/>
					<TextControl
						label={ __( 'Suffix Text', 'query-filter' ) }
						value={ suffix }
						onChange={ ( value ) => setAttributes( { suffix: value } ) }
					placeholder=""
					/>
				</PanelBody>
			</InspectorControls>
			<span { ...blockProps }>
				{ `${ prefix || '' }${ previewValue }${ suffix || '' }` }
			</span>
		</>
	);
}

