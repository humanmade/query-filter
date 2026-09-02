const { test, expect, POSTS } = require( './fixtures' );

test.describe( 'Query context without inherit', () => {
	test( 'the filters render without a PHP notice', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/no-inherit-context/' );
		await loop.expectTitles( POSTS.all );

		await expect( loop.postTypeSelect() ).toBeVisible();
		await expect( loop.taxonomySelect() ).toBeVisible();

		// The test mu-plugin collects anything this plugin's files raise and
		// prints it as an HTML comment, so the assertion does not depend on
		// how the environment is configured to display errors.
		const html = await page.content();
		expect( html ).toContain( 'qf-php-errors-checked' );
		expect( html ).not.toContain( 'qf-php-error:' );
	} );

	test( 'the filters still narrow the loop', async ( { page, loop } ) => {
		await page.goto( '/no-inherit-context/' );

		await loop.taxonomySelect().selectOption( { label: 'Alpha' } );

		await page.waitForURL( /query-4-category=alpha/ );
		await loop.expectTitles( POSTS.alpha );
	} );
} );
