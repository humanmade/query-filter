import { __ } from '@wordpress/i18n';
import {
	registerFormatType,
	insert,
	applyFormat,
} from '@wordpress/rich-text';
import { RichTextToolbarButton } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexItem,
	Modal,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { stack } from '@wordpress/icons';
import { useEffect, useMemo, useState } from '@wordpress/element';

const FORMAT_NAME = 'query-filter/taxonomy-inline-text';
const ATTRIBUTE_KEY = 'data-query-filter-text';

const DEFAULT_SETTINGS = {
	filterType: 'tag',
	valueType: 'title',
	prefix: '',
	suffix: '',
	link: false,
	showAfterFirstPage: true,
};

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

const getOptionLabel = ( options, value ) =>
	options.find( ( option ) => option.value === value )?.label || value;

const getPlaceholderText = ( settings ) => {
	const parts = [
		__( 'taxonomy', 'query-filter' ),
		getOptionLabel( FILTER_OPTIONS, settings.filterType ).toLowerCase(),
	];

	const valueLabel =
		( settings.filterType === 'sort' || settings.filterType === 'search' ) && settings.valueType !== 'page'
			? __( 'title', 'query-filter' )
			: getOptionLabel( VALUE_TYPE_OPTIONS, settings.valueType );

	parts.push( valueLabel.toLowerCase() );

	return parts.join( ' ' );
};

const parseSettings = ( attributeValue ) => {
	if ( ! attributeValue ) {
		return DEFAULT_SETTINGS;
	}

	try {
		const parsed = JSON.parse( attributeValue );

		return {
			filterType: parsed.filterType || DEFAULT_SETTINGS.filterType,
			valueType: parsed.valueType || DEFAULT_SETTINGS.valueType,
			prefix: parsed.prefix || '',
			suffix: parsed.suffix || '',
			link: parsed.link ?? DEFAULT_SETTINGS.link,
			showAfterFirstPage:
				parsed.showAfterFirstPage ?? DEFAULT_SETTINGS.showAfterFirstPage,
		};
	} catch ( error ) {
		return DEFAULT_SETTINGS;
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

	useEffect( () => {
		if ( settings.filterType === 'page' && settings.valueType !== 'page' ) {
			setSettings( ( prev ) => ( { ...prev, valueType: 'page' } ) );
		} else if (
			( settings.filterType === 'sort' || settings.filterType === 'search' ) &&
			settings.valueType === 'description'
		) {
			setSettings( ( prev ) => ( { ...prev, valueType: 'title' } ) );
		}
	}, [ settings.filterType, settings.valueType ] );

	const applyFormatToSelection = () => {
		const attributes = {
			[ ATTRIBUTE_KEY ]: JSON.stringify( settings ),
		};
		const selectionCollapsed = value.start === value.end;
		let nextValue = value;

		if ( selectionCollapsed && ! isActive ) {
			const placeholder = getPlaceholderText( settings );
			nextValue = insert( nextValue, placeholder );
			const end = nextValue.start;
			const start = end - placeholder.length;
			nextValue = { ...nextValue, start, end };
		}

		const newValue = applyFormat( nextValue, {
			type: FORMAT_NAME,
			attributes,
		} );

		onChange( newValue );
		setIsOpen( false );
	};

	const handleFilterChange = ( filterType ) => {
		setSettings( ( prev ) => ( {
			...prev,
			filterType,
			valueType:
				filterType === 'page'
					? 'page'
					: ( filterType === 'sort' || filterType === 'search' ) && prev.valueType === 'description'
					? 'title'
					: prev.valueType,
		} ) );
	};

	const valueTypeOptions =
		settings.filterType === 'page'
			? VALUE_TYPE_OPTIONS.filter( ( option ) => option.value === 'page' )
			: settings.filterType === 'sort' || settings.filterType === 'search'
			? VALUE_TYPE_OPTIONS.filter( ( option ) => option.value === 'title' )
			: VALUE_TYPE_OPTIONS;

	return (
		<>
			<RichTextToolbarButton
				icon={ stack }
				title={ __( 'Taxonomy Text', 'query-filter' ) }
				onClick={ () => setIsOpen( true ) }
				isActive={ isActive }
			/>
			{ isOpen && (
				<Modal
					title={ __( 'Dynamic Taxonomy Text', 'query-filter' ) }
					onRequestClose={ () => setIsOpen( false ) }
				>
					<SelectControl
						label={ __( 'Filter Source', 'query-filter' ) }
						value={ settings.filterType }
						options={ FILTER_OPTIONS }
						onChange={ handleFilterChange }
					/>
					{ settings.filterType !== 'search' && (
						<SelectControl
							label={ __( 'Value Type', 'query-filter' ) }
							value={ settings.valueType }
							options={ valueTypeOptions }
							disabled={ settings.filterType === 'page' }
							onChange={ ( valueType ) =>
								setSettings( ( prev ) => ( {
									...prev,
									valueType,
								} ) )
							}
						/>
					) }
					<TextControl
						label={ __( 'Prefix Text', 'query-filter' ) }
						value={ settings.prefix }
						onChange={ ( prefix ) =>
							setSettings( ( prev ) => ( { ...prev, prefix } ) )
						}
					/>
					<TextControl
						label={ __( 'Suffix Text', 'query-filter' ) }
						value={ settings.suffix }
						onChange={ ( suffix ) =>
							setSettings( ( prev ) => ( { ...prev, suffix } ) )
						}
					/>
					{ [ 'tag', 'category', 'yoast_primary_category' ].includes(
						settings.filterType
					) && (
						<ToggleControl
							label={ __(
								'Link to term archive',
								'query-filter'
							) }
							checked={ !! settings.link }
							onChange={ ( next ) =>
								setSettings( ( prev ) => ( {
									...prev,
									link: next,
								} ) )
							}
						/>
					) }
					{ settings.filterType === 'page' && (
						<ToggleControl
							label={ __( 'Only show after page 1', 'query-filter' ) }
							checked={ !! settings.showAfterFirstPage }
							onChange={ ( next ) =>
								setSettings( ( prev ) => ( {
									...prev,
									showAfterFirstPage: next,
								} ) )
							}
						/>
					) }
					<Flex justify="flex-start">
						<FlexItem>
							<Button variant="primary" onClick={ applyFormatToSelection }>
								{ __( 'Apply', 'query-filter' ) }
							</Button>
						</FlexItem>
					</Flex>
				</Modal>
			) }
		</>
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

