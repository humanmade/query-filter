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
			const { ref } = getElement();
			let name, values = [];

			// Get the current URL and preserve existing query parameters
			const currentURL = new URL( window.location.href );

			if (ref.tagName === 'INPUT' && ref.type === 'checkbox') {
				name = ref.name;

				// Handle checkboxes directly
				const container = ref.closest('.wp-block-query-filter__checkboxes');
				const checkboxes = container.querySelectorAll(
					`input[name="${name}"]:checked`
				);

				// Collect all selected values
				checkboxes.forEach((checkbox) => {
					values.push(checkbox.value);
				});

				// Create a comma-separated string of values
				const value = values.join(',');

				// Update the URL with the new value for checkboxes
				if (value) {
					currentURL.searchParams.set( name, value );
				} else {
					currentURL.searchParams.delete( name );
				}
			} else {
				// Handle other input types (e.g., <select>)
				name = ref.name;
				values = [ref.value];

				// Check if the selected value is empty (e.g., "All")
				if (values[0] === '') {
					// Remove the query parameter from the URL
					currentURL.searchParams.delete( name );
				} else {
					// Update the URL with the new value for the <select>
					currentURL.searchParams.set( name, values[0] );
				}
			}

			// Navigate to the updated URL
			const { actions } = yield import( '@wordpress/interactivity-router' );
			yield actions.navigate( currentURL.toString() );
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
			if ( value === state.searchValue ) return;

			state.searchValue = value;

			yield updateURL( action, value, name );
		},
	},
} );
