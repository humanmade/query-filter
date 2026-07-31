import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * How long the router may spend fetching a navigation before giving up, in
 * milliseconds.
 *
 * The router's default is 10s, after which it falls back to a full-page
 * `window.location.assign()`. Slow uncached renders (WP_DEBUG local
 * environments, cold caches) regularly brush against that default, turning
 * in-place filter updates into full reloads. The extended window keeps slow
 * responses on the in-place path; genuinely dead requests still fall back.
 */
const NAVIGATION_TIMEOUT = 30000;

const updateURL = async ( action, value, name ) => {
	const url = new URL( action );
	if ( value || name === 's' ) {
		url.searchParams.set( name, value );
	} else {
		url.searchParams.delete( name );
	}
	const { actions } = await import( '@wordpress/interactivity-router' );
	await actions.navigate( url.toString(), { timeout: NAVIGATION_TIMEOUT } );
};

store( 'query-filter', {
	actions: {
		navigate: withSyncEvent( function* ( e ) {
			e.preventDefault();
			const { actions } = yield import(
				'@wordpress/interactivity-router'
			);
			yield actions.navigate( e.target.value, {
				timeout: NAVIGATION_TIMEOUT,
			} );
		} ),
		toggleAllTerms() {
			const context = getContext();
			context.showAllTerms = ! context.showAllTerms;
		},
		search: withSyncEvent( function* ( e ) {
			e.preventDefault();
			// Scope search to block context so multiple searchable query loops may coexist.
			const context = getContext();
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
			if ( value === context.searchValue ) return;

			context.searchValue = value;

			yield updateURL( action, value, name );
		} ),
	},
} );
