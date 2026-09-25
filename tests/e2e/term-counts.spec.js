const { test, expect, POSTS } = require( './fixtures' );

/**
 * The `/term-counts/` page carries a category and a topic filter, both hiding terms
 * with no results and showing counts, in a loop with its own query (ID 10). The
 * fixtures: Alpha One (Alpha, SD-WAN), Alpha Two (Alpha, SASE), Beta One (Beta,
 * Cloud) and Unfiled Post (neither). SD-WAN and SASE sit under Networking.
 */

/**
 * The filters on the fixture pages, by the label each shows: the taxonomy's name.
 */
const FILTER_LABELS = {
	category: 'Categories',
	qf_topic: 'Topics',
	qf_shelf: 'Shelves',
};

/**
 * The term labels a filter renders, in order, as their visible text.
 *
 * A filter is found by its label rather than by its inputs: every input's URL carries
 * the other filters' selections too, so it would match more than one filter.
 *
 * @param {import('@playwright/test').Page} page     Page under test.
 * @param {string}                          taxonomy Taxonomy whose filter to read.
 * @return {Promise<string[]>} Labels, such as "Alpha (2)".
 */
async function termLabels( page, taxonomy ) {
	const labels = await page
		.locator( '.wp-block-query-filter-taxonomy' )
		.filter( {
			has: page.locator( '.wp-block-query-filter-taxonomy__label', {
				hasText: FILTER_LABELS[ taxonomy ],
			} ),
		} )
		.locator( 'label:has(input)' )
		.allInnerTexts();

	return labels.map( ( label ) => label.replace( /\s+/g, ' ' ).trim() );
}

/**
 * The labels of the terms a filter shows as selected.
 *
 * @param {import('@playwright/test').Page} page Page under test.
 * @return {Promise<string[]>} Labels of checked terms.
 */
async function checkedLabels( page ) {
	const labels = await page
		.locator( '.wp-block-query-filter-taxonomy label:has(input:checked)' )
		.allInnerTexts();

	return labels.map( ( label ) => label.replace( /\s+/g, ' ' ).trim() );
}

test.describe( 'Taxonomy filter term counts', () => {
	test( 'shows each term with its count, leaving out empty terms', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/term-counts/' );
		await loop.expectTitles( POSTS.all );

		// Uncategorized has no posts, so it is left out.
		expect( await termLabels( page, 'category' ) ).toEqual( [ 'Alpha (2)', 'Beta (1)' ] );

		// Networking has no posts of its own; its count is its children's.
		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Cloud (1)',
			'Networking (2)',
			'SASE (1)',
			'SD-WAN (1)',
		] );

		const html = await page.content();
		expect( html ).toContain( 'qf-php-errors-checked' );
		expect( html ).not.toContain( 'qf-php-error:' );
	} );

	test( 'a filter on another taxonomy narrows the counts', async ( { page, loop } ) => {
		await page.goto( '/term-counts/' );
		await loop.expectTitles( POSTS.all );

		await page.locator( 'label', { hasText: 'Cloud' } ).locator( 'input' ).check();

		await page.waitForURL( /query-10-qf_topic=cloud/ );
		await loop.expectTitles( POSTS.beta );

		// Only Beta One is filed under Cloud, so Alpha has nothing left to add.
		await expect.poll( () => termLabels( page, 'category' ) ).toEqual( [ 'Beta (1)' ] );
	} );

	test( "a taxonomy's own selection leaves its counts alone", async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/term-counts/?query-10-qf_topic=cloud' );
		await loop.expectTitles( POSTS.beta );

		// Topics combine with OR, so each still counts what selecting it would add.
		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Cloud (1)',
			'Networking (2)',
			'SASE (1)',
			'SD-WAN (1)',
		] );
		expect( await checkedLabels( page ) ).toEqual( [ 'Cloud (1)' ] );
	} );

	test( 'a selected term with no results stays, so it can be cleared', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/term-counts/?query-10-category=alpha&query-10-qf_topic=cloud' );
		await loop.expectTitles( [] );

		expect( await termLabels( page, 'category' ) ).toEqual( [ 'Alpha (0)', 'Beta (1)' ] );
		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Cloud (0)',
			'Networking (2)',
			'SASE (1)',
			'SD-WAN (1)',
		] );
		expect( ( await checkedLabels( page ) ).sort() ).toEqual( [
			'Alpha (0)',
			'Cloud (0)',
		] );
	} );

	test( 'a filter with no terms left is not rendered', async ( { page, loop } ) => {
		await page.goto( '/term-counts/?query-10-s=Unfiled' );
		await loop.expectTitles( POSTS.unfiled );

		// Unfiled Post has neither a category nor a topic.
		await expect( page.locator( '.wp-block-query-filter-taxonomy' ) ).toHaveCount( 0 );
	} );

	test( 'counts in an inherited loop are not narrowed by the queried term', async ( {
		page,
		loop,
	} ) => {
		// A category archive, filtered to a topic none of its posts carry. WordPress
		// writes the first term it queried back into the main query's vars; had that
		// reached the count, every topic would count within Cloud and only it be left.
		await page.goto( '/category/alpha/?query-qf_topic=cloud' );
		await loop.expectTitles( [] );

		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Cloud (0)',
			'Networking (2)',
			'SASE (1)',
			'SD-WAN (1)',
		] );

		const html = await page.content();
		expect( html ).toContain( 'qf-php-errors-checked' );
		expect( html ).not.toContain( 'qf-php-error:' );
	} );

	test( "terms the loop's own settings rule out are hidden", async ( { page, loop } ) => {
		// The core Query block is limited to the Alpha category.
		await page.goto( '/term-counts-loop-terms/' );
		await loop.expectTitles( POSTS.alpha );

		expect( await termLabels( page, 'category' ) ).toEqual( [ 'Alpha (2)' ] );

		// Cloud is only on Beta One, which the loop leaves out.
		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Networking (2)',
			'SASE (1)',
			'SD-WAN (1)',
		] );
	} );

	test( 'an Advanced Query Loop tax query narrows the counts', async ( {
		page,
		loop,
	} ) => {
		// Not in Beta, and filed under SD-WAN: two conditions on two taxonomies, joined
		// with AND, which leaves only Alpha One.
		await page.goto( '/term-counts-aql/' );
		await loop.expectTitles( [ 'Alpha One' ] );

		expect( await termLabels( page, 'category' ) ).toEqual( [ 'Alpha (1)' ] );
		expect( await termLabels( page, 'qf_topic' ) ).toEqual( [
			'Networking (1)',
			'SD-WAN (1)',
		] );
	} );

	test( 'a signed-in user and a visitor each see their own counts', async ( {
		page,
		browser,
		baseURL,
		loop,
	} ) => {
		// Signed in as an admin, the loop includes the two private books, and so do the
		// counts. These are never cached, so they cannot reach a visitor. The shelves
		// also hold a hundred empty aisles that sort first, which are left out.
		await page.goto( '/term-counts-private/' );
		// WordPress marks the private titles for the users who can see them.
		await loop.expectTitles( [ 'Book One', 'Private: Book Three', 'Private: Book Two' ] );
		expect( await termLabels( page, 'qf_shelf' ) ).toEqual( [
			'Fiction (2)',
			'Poetry (1)',
		] );

		// A visitor sees only the published book. The second visit is served from the
		// count cache the first one filled.
		// Playground signs in any request that has not already been through its automatic
		// login, so a visitor carries the cookie that marks it done, and no session.
		const context = await browser.newContext( {
			storageState: { cookies: [], origins: [] },
		} );
		await context.addCookies( [
			{
				name: 'playground_auto_login_already_happened',
				value: '1',
				url: baseURL,
			},
		] );
		const visitor = await context.newPage();

		for ( let visit = 0; visit < 2; visit++ ) {
			await visitor.goto( '/term-counts-private/' );
			await expect(
				visitor.locator( '.wp-block-post-template .wp-block-post-title' )
			).toHaveText( [ 'Book One' ] );
			expect( await termLabels( visitor, 'qf_shelf' ) ).toEqual( [ 'Fiction (1)' ] );
		}

		await context.close();

		// And the visitor's cached counts do not reach the admin.
		await page.reload();
		expect( await termLabels( page, 'qf_shelf' ) ).toEqual( [
			'Fiction (2)',
			'Poetry (1)',
		] );
	} );
} );
