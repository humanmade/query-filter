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

	test( 'an inherited loop does not carry its page as a hidden input', async ( {
		page,
	} ) => {
		// An inherited loop pages with `paged`, which is how its links read on plain
		// permalinks. One post per page puts page 2 in range.
		await page.goto( '/?s=&paged=2&qf_per_page=1' );

		const form = page.locator( '.wp-block-query form.wp-block-search' );
		await expect(
			form.locator( 'input[type="hidden"][name="qf_per_page"]' )
		).toHaveValue( '1' );
		await expect(
			form.locator( 'input[type="hidden"][name="paged"]' )
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

	test( 'a search from a later page of an inherited loop starts on page 1', async ( {
		page,
	} ) => {
		await page.goto( '/?s=&paged=2&qf_per_page=1' );

		const input = page.locator( '.wp-block-query .wp-block-search__input' );
		await input.fill( 'Alpha' );
		await input.press( 'Enter' );

		await page.waitForURL( /[?&]s=Alpha/ );
		expect( new URL( page.url() ).searchParams.has( 'paged' ) ).toBe( false );
	} );
} );
