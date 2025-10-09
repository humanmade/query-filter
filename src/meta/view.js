import { store } from '@wordpress/interactivity';

const { state } = store( 'query-filter', {
	actions: {
		*navigate( e ) {
			e.preventDefault();
			const { actions } = yield import(
				'@wordpress/interactivity-router'
			);
			yield actions.navigate( e.target.value );
		},
	},
} );
