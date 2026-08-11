const { test: base, expect } = require( '@playwright/test' );

/**
 * Fixture titles seeded by tests/seed.php, grouped for readability in
 * assertions. Keep in step with that file.
 */
const POSTS = {
	alpha: [ 'Alpha One', 'Alpha Two' ],
	beta: [ 'Beta One' ],
	unfiled: [ 'Unfiled Post' ],
	docs: [ 'Doc One', 'Doc Two' ],
	secret: [ 'Secret One' ],
};

POSTS.all = [ ...POSTS.alpha, ...POSTS.beta, ...POSTS.unfiled ];

/**
 * Helpers for reading a rendered query loop.
 */
const test = base.extend( {
	/**
	 * Query loop utilities bound to the current page.
	 *
	 * @param {Object}                          root0      Fixture arguments.
	 * @param {import('@playwright/test').Page} root0.page Page under test.
	 * @param {Function}                        use        Playwright fixture callback.
	 */
	loop: async ( { page }, use ) => {
		const loop = {
			/**
			 * Titles currently rendered by the query loop, in document order.
			 *
			 * @return {Promise<string[]>} Rendered post titles.
			 */
			async titles() {
				const titles = await page
					.locator( '.wp-block-post-template .wp-block-post-title' )
					.allInnerTexts();
				return titles.map( ( title ) => title.trim() );
			},

			/**
			 * Wait until the loop renders exactly the given titles.
			 *
			 * The interactivity router swaps the region in without a document
			 * navigation, so polling the rendered titles is the reliable
			 * signal that the update has landed.
			 *
			 * @param {string[]} expected Titles in the order they should appear.
			 */
			async expectTitles( expected ) {
				await expect
					.poll( () => loop.titles(), {
						message: `waiting for loop to render ${ JSON.stringify(
							expected
						) }`,
					} )
					.toEqual( expected );
			},

			/**
			 * The taxonomy filter's select control.
			 *
			 * @return {import('@playwright/test').Locator} Select locator.
			 */
			taxonomySelect() {
				return page.locator(
					'.wp-block-query-filter-taxonomy__select'
				);
			},

			/**
			 * The post type filter's select control.
			 *
			 * @return {import('@playwright/test').Locator} Select locator.
			 */
			postTypeSelect() {
				return page.locator(
					'.wp-block-query-filter-post-type__select'
				);
			},
		};

		await use( loop );
	},
} );

module.exports = { test, expect, POSTS };
