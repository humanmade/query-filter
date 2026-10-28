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

/**
 * Build the URL for a search from the page being viewed.
 *
 * The form's action is not used: other plugins filter search form actions
 * (Polylang points them at the language's home page), and the URL may have
 * moved on through client-side navigation since the form was rendered.
 *
 * @param {string}      name      Search parameter.
 * @param {string}      value     Search term.
 * @param {string|null} pageParam The query's page parameter, or null when it
 *                                inherits the main query and pages by path.
 * @return {Promise<void>} Resolves once navigated.
 */
const updateURL = async ( name, value, pageParam ) => {
	const { actions } = await import( '@wordpress/interactivity-router' );
	const { state: routerState } = store( 'core/router' );
	const url = new URL( routerState?.url || window.location.href );

	// A search is a new set of results, so it starts on the first page.
	if ( pageParam ) {
		url.searchParams.delete( pageParam );
	} else {
		url.searchParams.delete( 'paged' );
		url.pathname = url.pathname.replace( /\/page\/\d+\/?$/, '/' );
	}

	if ( value || name === 's' ) {
		url.searchParams.set( name, value );
	} else {
		url.searchParams.delete( name );
	}

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
		toggleChildren() {
			const context = getContext();
			context.expanded = ! context.expanded;
		},
		search: withSyncEvent( function* ( e ) {
			e.preventDefault();
			// Scope search to block context so multiple searchable query loops may coexist.
			const context = getContext();
			const { ref } = getElement();
			const input =
				ref.tagName === 'FORM'
					? ref.querySelector( 'input[type="search"]' )
					: ref;
			const { name, value } = input;

			// Don't navigate if the search didn't really change.
			if ( value === context.searchValue ) return;

			context.searchValue = value;

			yield updateURL( name, value, context.pageParam );
		} ),
	},
} );
