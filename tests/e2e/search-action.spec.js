const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Search action ownership', () => {
	test( 'a search block whose action another plugin rewrote still searches the loop', async ( {
		page,
		loop,
	} ) => {
		// The test mu-plugin rewrites search actions to the home page at
		// priority 10 when `qf_hijack` is set, as Polylang does.
		await page.goto( '/post-type-filter/?qf_hijack=1' );

		const form = page.locator( 'form.wp-block-search' );
		await expect( form ).toHaveAttribute( 'action', /post-type-filter/ );

		await page.locator( '.wp-block-search__input' ).fill( 'Alpha' );

		await page.waitForURL( /\/post-type-filter\/.*query-3-s=Alpha/ );
		await loop.expectTitles( POSTS.alpha );
	} );

	test( 'the URL is built from the page, not the rendered action', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/' );

		const form = page.locator( 'form.wp-block-search' );
		await form.evaluate( ( el ) =>
			el.setAttribute( 'action', 'https://example.org/' )
		);

		await page.locator( '.wp-block-search__input' ).fill( 'Beta' );

		await page.waitForURL( /\/post-type-filter\/.*query-3-s=Beta/ );
		await loop.expectTitles( POSTS.beta );
	} );

	test( 'the filters applied are carried as hidden inputs, without the page', async ( {
		page,
	} ) => {
		await page.goto(
			'/search-pagination/?query-5-page=2&query-5-post_type=post&query-5-s=x'
		);

		const form = page.locator( 'form.wp-block-search' );
		await expect(
			form.locator( 'input[type="hidden"][name="query-5-post_type"]' )
		).toHaveValue( 'post' );
		await expect(
			form.locator( 'input[type="hidden"][name="query-5-page"]' )
		).toHaveCount( 0 );
		await expect(
			form.locator( 'input[type="hidden"][name="query-5-s"]' )
		).toHaveCount( 0 );
	} );
} );

test.describe( 'Search without JavaScript', () => {
	test.use( { javaScriptEnabled: false } );

	test( 'submitting keeps the filters already applied', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/?query-3-post_type=qf_doc' );
		await loop.expectTitles( POSTS.docs );

		const input = page.locator( '.wp-block-search__input' );
		await input.fill( 'One' );
		await input.press( 'Enter' );

		await page.waitForURL( /query-3-s=One/ );
		expect( page.url() ).toContain( 'query-3-post_type=qf_doc' );
		await loop.expectTitles( [ 'Doc One' ] );
	} );
} );
