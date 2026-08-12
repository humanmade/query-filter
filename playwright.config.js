const { defineConfig, devices } = require( '@playwright/test' );

/**
 * Playground is booted by global-setup.js, which writes the server URL to
 * process.env.WP_BASE_URL. Set WP_BASE_URL directly to skip global-setup and
 * use an externally managed Playground (e.g. `npm run playground:start`).
 *
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig( {
	testDir: './tests/e2e',
	globalSetup: require.resolve( './global-setup' ),
	globalTeardown: require.resolve( './global-teardown' ),
	/* Playground boot is slow — 120s gives headroom */
	timeout: 120000,
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 2 : 0,
	/* Single worker — Playground is one shared instance with shared fixtures */
	workers: 1,
	reporter: [
		[ 'list' ],
		[ 'html', { open: process.env.CI ? 'never' : 'on-failure' } ],
		[ 'json', { outputFile: 'test-results/results.json' } ],
	],
	use: {
		baseURL: process.env.WP_BASE_URL,
		// Tell the server not to compress responses. Playground's WASM PHP can
		// set Content-Encoding: gzip without producing a valid gzip body, which
		// causes ERR_CONTENT_DECODING_FAILED. Sending 'identity' prevents PHP's
		// zlib output compression from activating entirely.
		extraHTTPHeaders: { 'Accept-Encoding': 'identity' },
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 15000,
		navigationTimeout: 30000,
		storageState: '.auth/wordpress.json',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
		},
	],
} );
