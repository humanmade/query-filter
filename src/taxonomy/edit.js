import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useCallback } from '@wordpress/element';

export default function Edit( { attributes, setAttributes } ) {
	const { taxonomy, emptyLabel, label, showLabel } = attributes;

	const updateAttributes = useCallback( setAttributes, [ setAttributes ] );

	const taxonomies = useSelect(
		( select ) => {
			const results = (
				select( 'core' ).getTaxonomies( { per_page: 100 } ) || []
			).filter( ( tax ) => tax.visibility.publicly_queryable );

			if ( results && results.length > 0 && ! taxonomy ) {
				updateAttributes( {
					taxonomy: results[ 0 ].slug,
					label: results[ 0 ].name,
				} );
			}

			return results;
		},
		[ taxonomy, updateAttributes ]
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
						options={ ( taxonomies || [] ).map( ( tax ) => ( {
							label: tax.name,
							value: tax.slug,
						} ) ) }
						onChange={ ( newTaxonomy ) =>
							setAttributes( {
								taxonomy: newTaxonomy,
								label: taxonomies.find(
									( tax ) => tax.slug === newTaxonomy
								).name,
							} )
						}
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
				{ showLabel && (
					<label
						className="wp-block-query-filter-taxonomy__label wp-block-query-filter__label"
						htmlFor="wp-block-query-filter-taxonomy__select"
					>
						{ label }
					</label>
				) }
				<select
					id="wp-block-query-filter-taxonomy__select"
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
			</div>
		</>
	);
}
