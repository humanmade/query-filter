import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

export default function Edit( { attributes, setAttributes } ) {
	const {
		taxonomy,
		emptyLabel,
		label,
		showLabel,
		limitToCurrentResults,
	} = attributes;

	const taxonomies = useSelect(
		( select ) => {
			const results = (
				select( 'core' ).getTaxonomies( { per_page: 100 } ) || []
			).filter( ( tax ) => tax.visibility?.publicly_queryable );

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
		( select ) =>
			select( 'core' ).getEntityRecords( 'taxonomy', taxonomy, {
				number: 50,
				hide_empty: true,
			} ) || [],
		[ taxonomy ]
	);

	const blockProps = useBlockProps( {
		className: 'wp-block-query-filter',
	} );

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
						onChange={ ( value ) => {
							const selected = taxonomies.find(
								( tax ) => tax.slug === value
							);
							setAttributes( {
								taxonomy: value,
								label: selected?.name || label,
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
						onChange={ ( value ) => setAttributes( { label: value } ) }
					/>
					<ToggleControl
						label={ __( 'Show Label', 'query-filter' ) }
						checked={ showLabel }
						onChange={ ( value ) => setAttributes( { showLabel: value } ) }
					/>
					<TextControl
						label={ __( 'Empty Choice Label', 'query-filter' ) }
						value={ emptyLabel }
						placeholder={ __( 'All', 'query-filter' ) }
						onChange={ ( value ) =>
							setAttributes( { emptyLabel: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Only show terms in current results', 'query-filter' ) }
						checked={ !! limitToCurrentResults }
						onChange={ ( value ) =>
							setAttributes( { limitToCurrentResults: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ showLabel && (
					<label className="wp-block-query-filter-taxonomy__label wp-block-query-filter__label">
						{ label || __( 'Taxonomy', 'query-filter' ) }
					</label>
				) }
				<select
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

