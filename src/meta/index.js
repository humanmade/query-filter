import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';

registerBlockType( 'query-filter/meta', {
	edit: Edit,
} );
