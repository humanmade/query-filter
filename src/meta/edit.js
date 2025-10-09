import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Spinner,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState, useEffect, useCallback } from '@wordpress/element';

export default function Edit( { attributes, setAttributes, context } ) {
	const { metaKey, emptyLabel, label, showLabel } = attributes;
	const [ metaValues, setMetaValues ] = useState( [] );
	const [ isLoadingValues, setIsLoadingValues ] = useState( false );
	const [ metaFieldOptions, setMetaFieldOptions ] = useState( [] );

	// Get post types from query context
	let contextPostTypes = ( context.query.postType || '' )
		.split( ',' )
		.map( ( type ) => type.trim() );

	// Support for enhanced query loop block plugin.
	if ( Array.isArray( context.query.multiple_posts ) ) {
		contextPostTypes = contextPostTypes.concat(
			context.query.multiple_posts
		);
	}

	// Fetch a single post for each post type to get meta fields
	const postsData = useSelect(
		select => {
			const { getEntityRecords } = select( coreStore );
			const data = {};

			contextPostTypes.forEach( postType => {
				data[ postType ] = getEntityRecords( 'postType', postType, {
					per_page: 1,
					context: 'edit',
				} );
			} );

			return data;
		},
		[ contextPostTypes ]
	);

	// Extract meta fields from fetched posts
	const fetchMetaFields = useCallback( async () => {
		const fields = [];
		const cardinalityCache = {};
		const metaKeySet = new Set();

		for ( const postType of contextPostTypes ) {
			const posts = postsData[ postType ];

			if ( posts && posts.length > 0 && posts[ 0 ].meta ) {
				const metaKeys = Object.keys( posts[ 0 ].meta );

				for ( const key of metaKeys ) {
					// Skip if we've already processed this key
					if ( metaKeySet.has( key ) ) {
						continue;
					}
					metaKeySet.add( key );

					// Check cardinality
					const cacheKey = `meta_cardinality_${ postType }_${ key }`;
					let cardinality = cardinalityCache[ cacheKey ];

					if ( ! cardinality ) {
						try {
							const cardinalityResponse = await apiFetch( {
								path: `/query-filter/v1/meta-cardinality?post_type=${ postType }&meta_key=${ key }`,
							} );
							cardinality = cardinalityResponse?.cardinality || 0;
							cardinalityCache[ cacheKey ] = cardinality;
						} catch ( error ) {
							cardinality = 999; // Assume too many if error
						}
					}

					const tooManyValues = cardinality > 50;

					fields.push( {
						label: tooManyValues
							? `${ key } (too many values)`
							: key,
						value: key,
						disabled: tooManyValues,
						cardinality,
					} );
				}
			}
		}

		// Sort fields: enabled first, then by label
		fields.sort( ( a, b ) => {
			if ( a.disabled !== b.disabled ) {
				return a.disabled ? 1 : -1;
			}
			return a.label.localeCompare( b.label );
		} );

		setMetaFieldOptions( fields );
	}, [ postsData, contextPostTypes ] );

	useEffect( () => {
		// Only fetch when we have posts data
		const hasAllPosts = contextPostTypes.every(
			postType => postsData[ postType ] !== undefined
		);

		if ( hasAllPosts && contextPostTypes.length > 0 ) {
			fetchMetaFields();
		}
	}, [ fetchMetaFields, postsData, contextPostTypes ] );

	// Fetch meta values when metaKey changes
	const fetchMetaValues = useCallback( async () => {
		if ( ! metaKey || isLoadingValues ) {
			return;
		}

		setIsLoadingValues( true );
		const cacheKey = `meta_values_${ contextPostTypes.join( '_' ) }_${ metaKey }`;
		const cacheExpiry = 60 * 60 * 1000; // 1 hour

		// Check localStorage cache
		try {
			const cached = localStorage.getItem( cacheKey );
			if ( cached ) {
				const { values, timestamp } = JSON.parse( cached );
				if ( Date.now() - timestamp < cacheExpiry ) {
					setMetaValues( values );
					setIsLoadingValues( false );
					return;
				}
			}
		} catch ( error ) {
			// Cache read error, continue with fetch
		}

		// Fetch from API
		try {
			const response = await apiFetch( {
				path: `/query-filter/v1/meta-values?post_type=${ contextPostTypes.join( ',' ) }&meta_key=${ metaKey }`,
			} );

			const values = response?.values || [];
			setMetaValues( values );

			// Cache the results
			try {
				localStorage.setItem(
					cacheKey,
					JSON.stringify( {
						values,
						timestamp: Date.now(),
					} )
				);
			} catch ( error ) {
				// Cache write error, not critical
			}
		} catch ( error ) {
			setMetaValues( [] );
		}

		setIsLoadingValues( false );
	}, [ isLoadingValues, metaKey, contextPostTypes ] );

	useEffect( () => {
		fetchMetaValues();
	}, [ fetchMetaValues ] );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Meta Field Settings', 'query-filter' ) }>
					<SelectControl
						label={ __( 'Select Meta Field', 'query-filter' ) }
						value={ metaKey }
						options={ [
							{ label: __( 'Select a field...', 'query-filter' ), value: '' },
							...metaFieldOptions,
						] }
						onChange={ ( newMetaKey ) => {
							const selectedField = metaFieldOptions.find(
								( field ) => field.value === newMetaKey
							);
							setAttributes( {
								metaKey: newMetaKey,
								label: selectedField?.label?.replace( ' (too many values)', '' ) || '',
							} );
						} }
					/>
					<TextControl
						label={ __( 'Label', 'query-filter' ) }
						value={ label }
						help={ __(
							'If empty then no label will be shown',
							'query-filter'
						) }
						onChange={ ( newLabel ) => setAttributes( { label: newLabel } ) }
					/>
					<ToggleControl
						label={ __( 'Show Label', 'query-filter' ) }
						checked={ showLabel }
						onChange={ ( newShowLabel ) =>
							setAttributes( { showLabel: newShowLabel } )
						}
					/>
					<TextControl
						label={ __( 'Empty Choice Label', 'query-filter' ) }
						value={ emptyLabel }
						placeholder={ __( 'All', 'query-filter' ) }
						onChange={ ( newEmptyLabel ) =>
							setAttributes( { emptyLabel: newEmptyLabel } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { className: 'wp-block-query-filter' } ) }>
				{ showLabel && label && (
					<label className="wp-block-query-filter-meta__label wp-block-query-filter__label">
						{ label }
					</label>
				) }
				<select
					className="wp-block-query-filter-meta__select wp-block-query-filter__select"
					inert="true"
				>
					<option>
						{ emptyLabel || __( 'All', 'query-filter' ) }
					</option>
					{ isLoadingValues && (
						<option disabled>
							<Spinner />{ ' ' }
							{ __( 'Loading values...', 'query-filter' ) }
						</option>
					) }
					{ ! isLoadingValues &&
						metaValues.map( ( value, index ) => (
							<option key={ index }>{ value }</option>
						) ) }
				</select>
			</div>
		</>
	);
}
