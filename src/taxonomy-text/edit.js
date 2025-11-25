import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';

const FILTER_OPTIONS = [
	{ label: __( 'Tag', 'query-filter' ), value: 'tag' },
	{ label: __( 'Category', 'query-filter' ), value: 'category' },
	{ label: __( 'Sort', 'query-filter' ), value: 'sort' },
];

const VALUE_TYPE_OPTIONS = [
	{ label: __( 'Title', 'query-filter' ), value: 'title' },
	{ label: __( 'Description', 'query-filter' ), value: 'description' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		filterType = 'tag',
		valueType = 'title',
		prefix = '',
		suffix = '',
	} = attributes;

	const blockProps = useBlockProps( {
		className: `taxonomy-text taxonomy-text--${ filterType }`,
	} );

	const previewValue =
		filterType === 'sort'
			? __( 'Selected Sort', 'query-filter' )
			: valueType === 'description'
			? __( 'Selected Term Description', 'query-filter' )
			: __( 'Selected Term', 'query-filter' );

	const handleFilterChange = ( nextFilter ) => {
		setAttributes( {
			filterType: nextFilter,
			valueType: nextFilter === 'sort' ? 'title' : valueType,
		} );
	};

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
					<SelectControl
						label={ __( 'Value Type', 'query-filter' ) }
						value={ valueType }
						options={ VALUE_TYPE_OPTIONS }
						disabled={ filterType === 'sort' }
						onChange={ ( nextValue ) =>
							setAttributes( { valueType: nextValue } )
						}
					/>
					<TextControl
						label={ __( 'Prefix Text', 'query-filter' ) }
						value={ prefix }
						onChange={ ( value ) => setAttributes( { prefix: value } ) }
						placeholder={ __( 'e.g. Showing results for ', 'query-filter' ) }
					/>
					<TextControl
						label={ __( 'Suffix Text', 'query-filter' ) }
						value={ suffix }
						onChange={ ( value ) => setAttributes( { suffix: value } ) }
						placeholder={ __( 'e.g. only', 'query-filter' ) }
					/>
				</PanelBody>
			</InspectorControls>
			<span { ...blockProps }>
				{ `${ prefix || '' }${ previewValue }${ suffix || '' }` }
			</span>
		</>
	);
}

