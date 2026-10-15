const { test, expect, POSTS } = require( './fixtures' );

/**
 * Titles of the posts filed under the "Networking" branch, through its
 * children: Alpha One (SD-WAN) and Alpha Two (SASE).
 */
const NETWORKING = POSTS.alpha;

test.describe( 'Taxonomy filter hierarchy', () => {
	test( 'nested mode renders children beneath their parent', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy/' );
		await loop.expectTitles( POSTS.all );

		const group = page.locator(
			'.wp-block-query-filter-taxonomy__checkbox-group'
		);
		await expect( group ).toHaveClass( /is-hierarchy-nested/ );

		// Top level, in name order: Cloud, then Networking, which is kept for
		// its children despite having no posts of its own.
		const roots = group.locator(
			'.wp-block-query-filter__term-list[data-depth="0"] > li > label'
		);
		await expect( roots ).toHaveText( [ 'Cloud', 'Networking' ], {
			useInnerText: true,
		} );

		// Children sit in a nested list inside the parent's item.
		const children = group.locator(
			'li.has-children .wp-block-query-filter__term-list[data-depth="1"] > li > label'
		);
		await expect( children ).toHaveText( [ 'SASE', 'SD-WAN' ], {
			useInnerText: true,
		} );

		// Nothing is collapsed in nested mode.
		await expect(
			group.locator( '.wp-block-query-filter__toggle-children' )
		).toHaveCount( 0 );
	} );

	test( 'selecting a parent matches posts in its children', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy/' );
		await loop.expectTitles( POSTS.all );

		await page
			.locator( 'label', { hasText: 'Networking' } )
			.locator( 'input' )
			.check();

		await page.waitForURL( /query-7-qf_topic=networking/ );
		await loop.expectTitles( NETWORKING );
	} );

	test( 'selecting a child narrows to that child', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy/' );
		await loop.expectTitles( POSTS.all );

		await page
			.locator( 'label', { hasText: 'SASE' } )
			.locator( 'input' )
			.check();

		await page.waitForURL( /query-7-qf_topic=sase/ );
		await loop.expectTitles( [ 'Alpha Two' ] );
	} );

	test( 'collapsed mode hides children until the parent is toggled', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy-collapsed/' );
		await loop.expectTitles( POSTS.all );

		const group = page.locator(
			'.wp-block-query-filter-taxonomy__checkbox-group'
		);
		await expect( group ).toHaveClass( /is-hierarchy-collapsed/ );

		const parent = group.locator( 'li.has-children', {
			hasText: 'Networking',
		} );
		const toggle = parent.locator(
			'.wp-block-query-filter__toggle-children'
		);
		const children = parent.locator(
			'.wp-block-query-filter__term-list[data-depth="1"]'
		);

		await expect( toggle ).toHaveAttribute( 'aria-expanded', 'false' );
		await expect( children ).toBeHidden();

		await toggle.click();
		await expect( toggle ).toHaveAttribute( 'aria-expanded', 'true' );
		await expect( children ).toBeVisible();
		await expect( children.locator( 'label' ) ).toHaveText(
			[ 'SASE', 'SD-WAN' ],
			{ useInnerText: true }
		);

		await toggle.click();
		await expect( children ).toBeHidden();

		// Cloud has no children, so it has nothing to toggle.
		await expect(
			group
				.locator( 'li', { hasText: 'Cloud' } )
				.locator( '.wp-block-query-filter__toggle-children' )
		).toHaveCount( 0 );
	} );

	test( 'a branch holding the active selection starts open', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy-collapsed/?query-8-qf_topic=sd-wan' );
		await loop.expectTitles( [ 'Alpha One' ] );

		const parent = page.locator( 'li.has-children', {
			hasText: 'Networking',
		} );

		await expect(
			parent.locator( '.wp-block-query-filter__toggle-children' )
		).toHaveAttribute( 'aria-expanded', 'true' );
		await expect(
			parent.locator( 'label', { hasText: 'SD-WAN' } ).locator( 'input' )
		).toBeChecked();
	} );

	test( 'a nested select indents children with dashes', async ( {
		page,
		loop,
	} ) => {
		await page.goto( '/taxonomy-hierarchy-select/' );

		const select = loop.taxonomySelect();
		await expect( select.locator( 'option' ) ).toHaveText( [
			'All',
			'Cloud',
			'Networking',
			'— SASE',
			'— SD-WAN',
		] );

		await select.selectOption( { label: '— SD-WAN' } );
		await page.waitForURL( /query-9-qf_topic=sd-wan/ );
		await loop.expectTitles( [ 'Alpha One' ] );
	} );

	test( 'flat mode is unchanged for a hierarchical taxonomy', async ( {
		page,
	} ) => {
		// The category fixtures on /taxonomy-checkboxes/ use the default,
		// flat, mode. Categories are hierarchical, so this proves the default
		// does not pull existing blocks into the new markup.
		await page.goto( '/taxonomy-checkboxes/' );

		const group = page.locator(
			'.wp-block-query-filter-taxonomy__checkbox-group'
		);
		await expect( group ).not.toHaveClass( /is-hierarchy-/ );
		await expect(
			group.locator( '.wp-block-query-filter__term-list' )
		).toHaveCount( 0 );
		await expect( group.locator( '> label' ) ).toHaveText(
			[ 'Alpha', 'Beta' ],
			{ useInnerText: true }
		);
	} );
} );
