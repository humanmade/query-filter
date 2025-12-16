import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import './format';

registerBlockType( metadata.name, {
	edit: Edit,
} );

