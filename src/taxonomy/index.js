import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import metadata from './block.json';

// Shared front end and editor styles for both filter blocks. wp-scripts splits
// any `style.css` out of its entry point, so this emits `build/taxonomy/style-index.css`,
// which is registered in PHP as the `query-filter-view` handle.
import './style.css';

registerBlockType( metadata.name, {
	/**
	 * @see ./edit.js
	 */
	edit: Edit,
} );
