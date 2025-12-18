import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

export default function Edit( { attributes, setAttributes } ) {
	const { taxonomy, emptyLabel, label, showLabel, listView } = attributes;

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
					<ToggleControl
						label={ __( 'Display as List', 'query-filter' ) }
						checked={ listView }
						onChange={ ( listView ) =>
							setAttributes( { listView } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { className: 'wp-block-query-filter' } ) }>
				{ listView ? (
					<>
						{ showLabel && (
							<div className="wp-block-query-filter-post-type__label wp-block-query-filter__label">
								{ label }
							</div>
						) }
						<ul
							className="wp-block-query-filter-taxonomy__list wp-block-query-filter__list"
							inert
						>
							<li className="wp-block-query-filter-taxonomy__item wp-block-query-filter__item wp-block-query-filter__item--active">
								<span className="wp-block-query-filter-taxonomy__link wp-block-query-filter__link">
									{ emptyLabel || __( 'All', 'query-filter' ) }
								</span>
							</li>
							{ terms.map( ( term ) => (
								<li
									key={ term.slug }
									className="wp-block-query-filter-taxonomy__item wp-block-query-filter__item"
								>
									<span className="wp-block-query-filter-taxonomy__link wp-block-query-filter__link">
										{ term.name }
									</span>
								</li>
							) ) }
						</ul>
					</>
				) : (
					<>
						{ showLabel && (
							<label className="wp-block-query-filter-taxonomy__label wp-block-query-filter__label">
								{ label }
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
					</>
				) }
			</div>
		</>
	);
}
