const { test, expect } = require( './fixtures' );

/**
 * Each block's `style` field points at the stylesheet its entry point emits, so
 * WordPress registers and enqueues it from block.json. Nothing in the build
 * fails when that file is missing — the page just renders unstyled and 404s on
 * the request — so assert both that nothing 404s and that the rules reach the
 * block.
 */
test.describe( 'Block styles', () => {
	test( 'the stylesheet reaches the page without a 404', async ( {
		page,
	} ) => {
		const failed = [];

		page.on( 'response', ( response ) => {
			if (
				response.url().includes( '/build/' ) &&
				response.status() >= 400
			) {
				failed.push( `${ response.status() } ${ response.url() }` );
			}
		} );

		await page.goto( '/taxonomy-filter/' );
		await expect(
			page.locator( '.wp-block-query-filter' ).first()
		).toBeVisible();

		// Issue #53 itself: the block asked for a stylesheet the build never
		// produced, and the request 404'd.
		expect( failed ).toEqual( [] );

		// WordPress inlines a block stylesheet below `styles_inline_size_limit`
		// and links it above, so assert on the rules landing in the CSSOM rather
		// than on which of the two it picked.
		const hasRules = await page.evaluate( () =>
			Array.from( document.styleSheets ).some( ( sheet ) => {
				try {
					return Array.from( sheet.cssRules ).some( ( rule ) =>
						rule.selectorText?.includes( '.wp-block-query-filter' )
					);
				} catch {
					return false;
				}
			} )
		);
		expect( hasRules, 'block rules are present in the CSSOM' ).toBe( true );
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

	test( 'the post type filter gets the styles too', async ( { page } ) => {
		await page.goto( '/post-type-filter/' );

		const block = page.locator( '.wp-block-query-filter' ).first();
		await expect( block ).toBeVisible();

		// The two blocks emit separate copies of the shared stylesheet, so this
		// would catch only one of them being wired up.
		await expect( block ).toHaveCSS( 'display', 'flex' );
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
