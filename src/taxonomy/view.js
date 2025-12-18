import { store, getElement } from '@wordpress/interactivity';

const updateURL = async ( action, value, name ) => {
	const url = new URL( action );
	if ( value || name === 's' ) {
		url.searchParams.set( name, value );
	} else {
		url.searchParams.delete( name );
	}
	const { actions } = await import( '@wordpress/interactivity-router' );
	await actions.navigate( url.toString() );
};

const { state } = store( 'query-filter', {
	actions: {
		*navigate( e ) {
			e.preventDefault();
			const { actions } = yield import(
				'@wordpress/interactivity-router'
			);
			// Handle both select elements (value) and links (href).
			const url =
				e.target.value ||
				e.target.href ||
				e.target.closest( 'a' )?.href;
			if ( url ) {
				yield actions.navigate( url );
			}
		},
		*search( e ) {
			e.preventDefault();
			const { ref } = getElement();
			let action, name, value;
			if ( ref.tagName === 'FORM' ) {
				const input = ref.querySelector( 'input[type="search"]' );
				action = ref.action;
				name = input.name;
				value = input.value;
			} else {
				action = ref.closest( 'form' ).action;
				name = ref.name;
				value = ref.value;
			}

			// Don't navigate if the search didn't really change.
			if ( value === state.searchValue ) {
				return;
			}

			state.searchValue = value;

			yield updateURL( action, value, name );
		},
	},
} );
