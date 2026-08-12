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
} );
