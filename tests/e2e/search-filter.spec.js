const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Search filter', () => {
	test( 'the core search block narrows the loop it sits in', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/' );
		await loop.expectTitles( POSTS.all );

		const input = page.locator( '.wp-block-search__input' );
		await expect( input ).toBeVisible();

		// The search block is rewritten to post into the loop's own query var
		// so several searchable loops can coexist on one page.
		await expect( input ).toHaveAttribute( 'name', 'query-3-s' );

		await input.fill( 'Alpha' );

		await page.waitForURL( /query-3-s=Alpha/ );
		await loop.expectTitles( POSTS.alpha );
	} );

	test( 'typing a word searches once, when the typing pauses', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/' );
		await loop.expectTitles( POSTS.all );

		const searches = [];
		page.on( 'request', ( request ) => {
			const term = new URL( request.url() ).searchParams.get(
				'query-3-s'
			);
			if ( term !== null ) {
				searches.push( term );
			}
		} );

		await page
			.locator( '.wp-block-search__input' )
			.pressSequentially( 'Alpha', { delay: 60 } );

		await page.waitForURL( /query-3-s=Alpha/ );
		await loop.expectTitles( POSTS.alpha );
		expect( searches ).toEqual( [ 'Alpha' ] );
	} );

	test( 'submitting searches at once', async ( { page, loop } ) => {
		await page.goto( '/post-type-filter/' );
		await loop.expectTitles( POSTS.all );

		const searches = [];
		page.on( 'request', ( request ) => {
			const term = new URL( request.url() ).searchParams.get(
				'query-3-s'
			);
			if ( term !== null ) {
				searches.push( term );
			}
		} );

		const input = page.locator( '.wp-block-search__input' );
		const request = page.waitForRequest( /query-3-s=Beta/ );

		// The search starts before the typing pause ends.
		const start = Date.now();
		await input.fill( 'Beta' );
		await input.press( 'Enter' );
		await request;
		expect( Date.now() - start ).toBeLessThan( 300 );

		await loop.expectTitles( POSTS.beta );

		// The search the typing started does not follow the submission.
		await page.waitForTimeout( 500 );
		expect( searches ).toEqual( [ 'Beta' ] );
	} );

	test( 'a search term in the URL is reflected in the input', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/?query-3-s=Beta' );

		await loop.expectTitles( POSTS.beta );
		await expect( page.locator( '.wp-block-search__input' ) ).toHaveValue(
			'Beta'
		);
	} );

	test( 'searching from a later page starts the results over', async ( {
		page,
		loop,
	} ) => {
		// Two posts to a page, so page 2 holds the posts a search for "Alpha"
		// does not match. Carrying the page parameter into the search renders
		// an empty loop over results that do exist.
		await page.goto( '/search-pagination/?query-5-page=2' );
		await loop.expectTitles( [ 'Beta One', 'Unfiled Post' ] );

		await page.locator( '.wp-block-search__input' ).fill( 'Alpha' );

		await page.waitForURL( /query-5-s=Alpha/ );
		expect( page.url() ).not.toContain( 'query-5-page' );
		await loop.expectTitles( POSTS.alpha );
	} );
} );
