import { store, getElement } from '@wordpress/interactivity';

const updateURL = async ( value, name ) => {
	const url = new URL( window.location );
	if ( value ) {
		url.searchParams.set( name, value );
	} else {
		url.searchParams.delete( name );
	}
	const { actions } = await import( '@wordpress/interactivity-router' );
	await actions.navigate( `${ url.search }${ url.hash }` || url.pathname );
};

const { state } = store( 'query-filter', {
	actions: {
		*navigate( e ) {
			e.preventDefault();
			const { actions } = yield import(
				'@wordpress/interactivity-router'
			);
			yield actions.navigate( e.target.value );
		},
		*search( e ) {
			e.preventDefault();
			const { ref } = getElement();
			const { value, name } = ref;

			// Don't navigate if the search didn't really change.
			if ( value === state.searchValue ) return;

			state.searchValue = value;

			yield updateURL( value, name );
		},
	},
} );
