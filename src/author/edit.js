import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { emptyLabel, label, showLabel } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Author Filter Settings', 'query-filter' ) }>
					<TextControl
						label={ __( 'Label', 'query-filter' ) }
						value={ label }
						defaultValue={ __( 'Author', 'query-filter' ) }
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
						placeholder={ __( 'All Authors', 'query-filter' ) }
						onChange={ ( newEmptyLabel ) =>
							setAttributes( { emptyLabel: newEmptyLabel } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { className: 'wp-block-query-filter' } ) }>
				{ showLabel && (
					<label className="wp-block-query-filter-author__label wp-block-query-filter__label">
						{ label || __( 'Author', 'query-filter' ) }
					</label>
				) }
				<select
					className="wp-block-query-filter-author__select wp-block-query-filter__select"
					inert
				>
					<option>
						{ emptyLabel || __( 'All Authors', 'query-filter' ) }
					</option>
					<option>{ __( 'Sample Author 1', 'query-filter' ) }</option>
					<option>{ __( 'Sample Author 2', 'query-filter' ) }</option>
				</select>
			</div>
		</>
	);
}
