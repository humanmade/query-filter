const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Post type filter', () => {
	test( 'renders a select for the post types the loop queries', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/' );

		const select = loop.postTypeSelect();
		await expect( select ).toBeVisible();
		await expect( select.locator( 'option' ) ).toHaveText( [
			'All',
			'Posts',
		] );

		await loop.expectTitles( POSTS.all );
	} );

	test( 'a public post type in the URL switches the loop', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/post-type-filter/?query-3-post_type=qf_doc' );

		await loop.expectTitles( POSTS.docs );
	} );

	test( 'a private post type in the URL is ignored', async ( {
		page,
		loop,
	} ) => {
		// qf_secret is registered with public and publicly_queryable false.
		// Its posts are published, so without a viewability check the loop
		// would happily list them.
		const response = await page.goto(
			'/post-type-filter/?query-3-post_type=qf_secret'
		);

		expect( response.status() ).toBe( 200 );
		await loop.expectTitles( POSTS.all );
		await expect( page.locator( 'body' ) ).not.toContainText(
			'Secret One'
		);
	} );

	test( 'an unregistered post type in the URL is ignored', async ( {
		page,
		loop,
	} ) => {
		await page.goto(
			'/post-type-filter/?query-3-post_type=not_a_post_type'
		);

		await loop.expectTitles( POSTS.all );
	} );

	test( 'a mixed list keeps only the public post types', async ( {
		page,
		loop,
	} ) => {
		await page.goto(
			'/post-type-filter/?query-3-post_type=qf_doc,qf_secret'
		);

		await loop.expectTitles( POSTS.docs );
		await expect( page.locator( 'body' ) ).not.toContainText(
			'Secret One'
		);
	} );

	test( 'an array shaped post type value does not error', async ( {
		page,
		loop,
	} ) => {
		// ?query-3-post_type[]=x reached urldecode() as an array, which is an
		// uncaught TypeError on PHP 8.
		const response = await page.goto(
			'/post-type-filter/?query-3-post_type%5B%5D=qf_secret'
		);

		expect( response.status() ).toBe( 200 );
		await loop.expectTitles( POSTS.all );
	} );
} );
