import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Spinner,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState, useEffect, useMemo } from '@wordpress/element';

export default function Edit( { attributes, setAttributes, context } ) {
	const { metaKey, emptyLabel, label, showLabel } = attributes;
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

	// Get meta cardinality and values from the data store
	const { metaCardinalities, metaValues, isLoadingValues } = useSelect(
		select => {
			const metaStore = select( 'query-filter/meta' );
			const cardinalities = {};

			// Get cardinality for all meta keys across all post types
			contextPostTypes.forEach( postType => {
				const posts = postsData[ postType ];
				if ( posts && posts.length > 0 && posts[ 0 ].meta ) {
					Object.keys( posts[ 0 ].meta ).forEach( key => {
						if ( ! cardinalities[ key ] ) {
							cardinalities[ key ] = metaStore?.getMetaCardinality( postType, key );
						}
					} );
				}
			} );

			// Get meta values for selected key
			const values = metaKey && contextPostTypes.length > 0
				? metaStore?.getMetaValues( contextPostTypes, metaKey )
				: [];

			return {
				metaCardinalities: cardinalities,
				metaValues: values || [],
				isLoadingValues: ! metaKey || values === undefined,
			};
		},
		[ contextPostTypes, postsData, metaKey ]
	);

	// Extract meta fields from posts and combine with cardinality
	const allMetaKeys = useMemo( () => {
		const metaKeySet = new Set();

		contextPostTypes.forEach( postType => {
			const posts = postsData[ postType ];
			if ( posts && posts.length > 0 && posts[ 0 ].meta ) {
				Object.keys( posts[ 0 ].meta ).forEach( key => {
					metaKeySet.add( key );
				} );
			}
		} );

		return Array.from( metaKeySet );
	}, [ postsData, contextPostTypes ] );

	// Build field options when meta keys or cardinalities change
	useEffect( () => {
		const fields = allMetaKeys.map( key => {
			const cardinality = metaCardinalities[ key ] || 0;
			const tooManyValues = cardinality > 50;

			return {
				label: tooManyValues
					? `${ key } (too many values)`
					: key,
				value: key,
				disabled: tooManyValues,
				cardinality,
			};
		} );

		// Sort fields: enabled first, then by label
		fields.sort( ( a, b ) => {
			if ( a.disabled !== b.disabled ) {
				return a.disabled ? 1 : -1;
			}
			return a.label.localeCompare( b.label );
		} );

		setMetaFieldOptions( fields );
	}, [ allMetaKeys, metaCardinalities ] );

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
