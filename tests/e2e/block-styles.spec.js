const { test, expect } = require( './fixtures' );

/**
 * The blocks share one stylesheet, registered in PHP as `query-filter-view` and
 * named by both block.json files. Nothing in the build fails when that file is
 * missing — the page just renders unstyled and requests a 404 — so assert both
 * that the request succeeds and that the rules reach the block.
 */
test.describe( 'Block styles', () => {
	test( 'the shared stylesheet is enqueued and loads', async ( { page } ) => {
		const responses = [];

		page.on( 'response', ( response ) => {
			if ( response.url().includes( 'query-filter' ) ) {
				responses.push( response );
			}
		} );

		await page.goto( '/taxonomy-filter/' );

		const link = page.locator(
			'link[rel="stylesheet"][href*="query-filter"][href*="style-index.css"]'
		);
		await expect( link ).toHaveCount( 1 );

		const href = await link.getAttribute( 'href' );

		// A version query string keeps a changed stylesheet from being served
		// from cache. The build's asset version only tracks JavaScript, so this
		// has to come from the stylesheet itself.
		expect( href ).toMatch( /style-index\.css\?ver=.+/ );

		const stylesheet = responses.find( ( response ) =>
			response.url().includes( 'style-index.css' )
		);
		expect( stylesheet, 'stylesheet was requested' ).toBeTruthy();
		expect( stylesheet.status() ).toBe( 200 );
	} );

	test( 'the stylesheet applies to the rendered block', async ( {
		page,
	} ) => {
		await page.goto( '/taxonomy-filter/' );

		const block = page.locator( '.wp-block-query-filter' ).first();
		await expect( block ).toBeVisible();

		// From the stylesheet's own `.wp-block-query-filter` rule. Absent it,
		// the wrapper is a plain block-level div.
		await expect( block ).toHaveCSS( 'display', 'flex' );
		await expect( block ).toHaveCSS( 'flex-direction', 'column' );
	} );

	test( 'checkbox groups pick up their layout rules', async ( { page } ) => {
		await page.goto( '/taxonomy-checkboxes/' );

		const group = page
			.locator( '.wp-block-query-filter__checkbox-group' )
			.first();
		await expect( group ).toBeVisible();

		await expect( group ).toHaveCSS( 'display', 'flex' );
		await expect( group ).toHaveCSS( 'row-gap', '8px' );
	} );
} );
