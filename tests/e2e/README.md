# End-to-End Tests

Playwright tests for the query filter blocks, run against
[WordPress Playground](https://wordpress.org/playground/) rather than a Docker
based environment. There is nothing to start or stop: Playground boots in
process and is torn down when the run finishes.

## Running the tests

```bash
npm ci
npm run build   # tests run against build/, not src/
npm run test:e2e
```

Other commands:

- `npm run test:e2e:debug` — step through tests in the Playwright inspector.
- `npm run test:e2e:watch` — the Playwright UI, reruns on change.
- `npm run playground:start` — boot the same environment for manual poking,
  without running any tests.

## How the environment is put together

`blueprint.json` describes the whole environment and is shared between the test
run and `npm run playground:start`:

1. Logs in as `admin` / `password`.
2. Installs and activates Twenty Twenty-Five and the Advanced Query Loop
   plugin.
3. Activates this plugin, mounted from the working tree.
4. Copies `tests/mu-plugins/register-test-content.php` into `mu-plugins`, which
   registers the post types and taxonomies the tests filter against — including
   deliberately private ones.
5. Runs `tests/seed.php`, which creates the fixture terms, posts and the demo
   pages the specs visit.

Seeding is idempotent, guarded by the `query_filter_e2e_seeded` option.

### Fixture content

| Page | Query ID | Contains |
| ---- | -------- | -------- |
| `/taxonomy-filter/` | 1 | Taxonomy filter (select) |
| `/taxonomy-checkboxes/` | 2 | Taxonomy filter (checkboxes) |
| `/post-type-filter/` | 3 | Post type filter and core search block |

Posts: `Alpha One` and `Alpha Two` in the `alpha` category, `Beta One` in
`beta`, and `Unfiled Post` in neither — so an active filter is always
distinguishable from no filter. `Doc One` and `Doc Two` are in the public
`qf_doc` post type. `Secret One` is published in the private `qf_secret` post
type and must never appear on the front end.

## Configuration

| Variable | Purpose |
| -------- | ------- |
| `WP_BASE_URL` | Use an already running Playground and skip booting one. |
| `WP_PLAYGROUND_PORT` | Pin the port. Otherwise derived from a hash of the working directory, so worktrees don't collide. |
| `WP_PLAYGROUND_PHP` | PHP version, e.g. `8.3`. |
| `WP_PLAYGROUND_WP` | WordPress version, e.g. `6.8` or `latest`. |
| `WP_BLUEPRINT_PATH` | Use a different blueprint. |

## Writing tests

Import from `./fixtures` rather than `@playwright/test` directly. It provides
the `loop` fixture for reading a rendered query loop, and `POSTS` for the
fixture titles:

```js
const { test, expect, POSTS } = require( './fixtures' );

test( 'filters the loop', async ( { page, loop } ) => {
	await page.goto( '/taxonomy-filter/' );
	await loop.taxonomySelect().selectOption( { label: 'Alpha' } );
	await page.waitForURL( /query-1-category=alpha/ );
	await loop.expectTitles( POSTS.alpha );
} );
```

Filtering navigates through the Interactivity API router, which swaps the loop
region in without a document navigation. Use `loop.expectTitles()`, which polls
the rendered titles, rather than waiting on a load event.

## CI

`.github/workflows/playwright-tests.yml` runs the suite on pushes to `main` and
on pull requests, across a PHP 8.2/8.3 × WordPress 6.8/latest matrix, and
comments the results on the PR.
