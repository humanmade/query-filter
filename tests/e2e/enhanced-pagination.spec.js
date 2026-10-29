const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Enhanced pagination', () => {
	test( 'the core/query namespace on the loop wrapper is preserved', async ( {
		page,
		loop,
	} ) => {
		const errors = [];
		page.on( 'pageerror', ( error ) => errors.push( error.message ) );

		await page.goto( '/enhanced-pagination/' );
		await loop.expectTitles( [ 'Alpha One' ] );

		// With enhanced pagination on, core owns the wrapper namespace. The
		// plugin only adds the router region.
		const wrapper = page.locator( '.wp-block-query' );
		await expect( wrapper ).toHaveAttribute(
			'data-wp-interactive',
			'core/query'
		);
		await expect( wrapper ).toHaveAttribute(
			'data-wp-router-region',
			'query-15'
		);

		await page.locator( '.wp-block-query-pagination-next' ).click();
		await loop.expectTitles( [ 'Alpha Two' ] );
		expect( page.url() ).toContain( 'query-15-page=2' );

		await loop.taxonomySelect().selectOption( { label: 'Beta' } );
		await page.waitForURL( /query-15-category=beta/ );
		await loop.expectTitles( POSTS.beta );

		expect( errors ).toEqual( [] );
	} );

	test( 'the plugin namespace is applied when core sets none', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/search-pagination/' );
		await loop.expectTitles( POSTS.alpha );

		const wrapper = page.locator( '.wp-block-query' );
		await expect( wrapper ).toHaveAttribute(
			'data-wp-interactive',
			'query-filter'
		);
		await expect( wrapper ).toHaveAttribute(
			'data-wp-router-region',
			'query-5'
		);
	} );
} );
