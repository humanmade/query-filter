import { registerBlockType } from '@wordpress/blocks';
import Edit from './edit';
import '../store';

registerBlockType( 'query-filter/meta', {
	edit: Edit,
} );
