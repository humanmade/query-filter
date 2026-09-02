const { test, expect, POSTS } = require( './fixtures' );

/**
 * The search results template carries a query loop that inherits the main
 * query, with a search block inside it — see tests/mu-plugins. A term reaches
 * that page in WordPress' own `s`, because that is what routing reads, so the
 * wired field has to be named `s` as well.
 */
test.describe( 'Search filter in an inherited query', () => {
	test( 'the field is wired to the site search term', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/?s=Alpha' );

		const input = page.locator( '.wp-block-query .wp-block-search__input' );
		await expect( input ).toHaveAttribute( 'name', 's' );
		await expect( input ).toHaveValue( 'Alpha' );

		// The main query orders search results its own way, so compare as a set.
		await expect
			.poll( async () => ( await loop.titles() ).sort() )
			.toEqual( POSTS.alpha );
	} );

	test( 'clearing the field clears the search', async ( { page, loop } ) => {
		await page.goto( '/?s=Alpha' );
		await expect
			.poll( async () => ( await loop.titles() ).sort() )
			.toEqual( POSTS.alpha );

		await page
			.locator( '.wp-block-query .wp-block-search__input' )
			.fill( '' );

		await page.waitForURL( /\?s=$/ );

		// An empty term is still a search to WordPress, and returns everything.
		await expect.poll( () => loop.titles() ).toContain( POSTS.beta[ 0 ] );
	} );
} );
