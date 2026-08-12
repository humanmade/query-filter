const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Taxonomy filter', () => {
	test( 'renders a select listing every non-empty term', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-filter/' );

		const select = loop.taxonomySelect();
		await expect( select ).toBeVisible();
		await expect( select.locator( 'option' ) ).toHaveText( [
			'All',
			'Alpha',
			'Beta',
		] );

		// Unfiltered, the loop shows every post.
		await loop.expectTitles( POSTS.all );
	} );

	test( 'selecting a term filters the loop and updates the URL', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-filter/' );
		await loop.expectTitles( POSTS.all );

		await loop.taxonomySelect().selectOption( { label: 'Alpha' } );

		await page.waitForURL( /query-1-category=alpha/ );
		await loop.expectTitles( POSTS.alpha );
	} );

	test( 'a term in the URL filters the loop on first render', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-filter/?query-1-category=beta' );

		await loop.expectTitles( POSTS.beta );

		// The control reflects the active filter rather than resetting to All.
		await expect( loop.taxonomySelect() ).toHaveValue(
			/query-1-category=beta/
		);
	} );

	test( 'returning to All clears the filter', async ( { page, loop } ) => {
		await page.goto( '/taxonomy-filter/?query-1-category=alpha' );
		await loop.expectTitles( POSTS.alpha );

		await loop.taxonomySelect().selectOption( { label: 'All' } );

		await page.waitForURL(
			( url ) => ! url.search.includes( 'query-1-category' )
		);
		await loop.expectTitles( POSTS.all );
	} );

	test( 'an unknown term slug returns nothing rather than everything', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-filter/?query-1-category=does-not-exist' );

		await loop.expectTitles( [] );
	} );

	test( 'checkbox mode selects several terms at once', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-checkboxes/' );
		await loop.expectTitles( POSTS.all );

		const group = page.locator(
			'.wp-block-query-filter-taxonomy__checkbox-group'
		);
		// useInnerText, because the label markup wraps its text across lines
		// and toHaveText compares textContent verbatim.
		await expect( group.locator( 'label' ) ).toHaveText(
			[ 'Alpha', 'Beta' ],
			{ useInnerText: true }
		);

		await group
			.locator( 'label', { hasText: 'Alpha' } )
			.locator( 'input' )
			.check();
		await page.waitForURL( /query-2-category=alpha/ );
		await loop.expectTitles( POSTS.alpha );

		await group
			.locator( 'label', { hasText: 'Beta' } )
			.locator( 'input' )
			.check();
		await page.waitForURL(
			/query-2-category=alpha%2Cbeta|query-2-category=alpha,beta/
		);
		await loop.expectTitles( [ ...POSTS.alpha, ...POSTS.beta ] );
	} );

	test( 'a private taxonomy named in the URL is ignored', async ( {
		page,
		loop,
	} ) => {
		// qf_hidden is registered non-public, and only Alpha One carries the
		// "classified" term. If the filter were honoured the loop would narrow
		// to that single post, turning the front end into an oracle for a
		// private grouping.
		await page.goto( '/taxonomy-filter/?query-1-qf_hidden=classified' );

		await loop.expectTitles( POSTS.all );
	} );

	test( 'an unregistered taxonomy named in the URL is ignored', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-filter/?query-1-not_a_taxonomy=whatever' );

		await loop.expectTitles( POSTS.all );
	} );
} );
