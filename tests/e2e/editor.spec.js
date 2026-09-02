const { test, expect } = require( './fixtures' );

/**
 * The editor previews of the filter controls are deliberately non-interactive.
 * React only accepts `inert` as a string, so writing the attribute bare passes
 * a boolean and every render of the block logs "Received `true` for a
 * non-boolean attribute `inert`" into the editor console.
 */
test.describe( 'Editor previews', () => {
	/**
	 * Open a fixture page in the block editor and return anything logged about
	 * a DOM attribute while it rendered.
	 *
	 * @param {import('@playwright/test').Page} page Page under test.
	 * @param {string}                          slug Fixture page slug.
	 * @return {Promise<string[]>} Matching console messages.
	 */
	async function openInEditor( page, slug ) {
		const messages = [];
		page.on( 'console', ( message ) => {
			const text = message.text();
			if (
				/inert|non-boolean attribute|Invalid DOM property/i.test(
					text
				) &&
				! messages.includes( text )
			) {
				messages.push( text );
			}
		} );

		const response = await page.request.get(
			`/wp-json/wp/v2/pages?slug=${ slug }`
		);
		const [ fixture ] = await response.json();
		expect( fixture, `fixture page /${ slug }/ exists` ).toBeTruthy();

		await page.goto(
			`/wp-admin/post.php?post=${ fixture.id }&action=edit`
		);

		// Deduplicated: React logs the same warning once per rendered control,
		// and a failure is easier to read as the distinct messages.
		return messages;
	}

	test( 'the taxonomy select preview renders without a React warning', async ( {
		page,
	} ) => {
		const messages = await openInEditor( page, 'taxonomy-filter' );

		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		await expect(
			canvas.locator( '.wp-block-query-filter-taxonomy__select' )
		).toBeVisible( { timeout: 60000 } );

		expect( messages ).toEqual( [] );
	} );

	test( 'the checkbox preview renders without a React warning', async ( {
		page,
	} ) => {
		const messages = await openInEditor( page, 'taxonomy-checkboxes' );

		const canvas = page.frameLocator( 'iframe[name="editor-canvas"]' );
		await expect(
			canvas
				.locator(
					'.wp-block-query-filter-taxonomy__checkbox-group input'
				)
				.first()
		).toBeVisible( { timeout: 60000 } );

		expect( messages ).toEqual( [] );
	} );
} );
