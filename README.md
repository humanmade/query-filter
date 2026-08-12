# Query Loop Filters

![image](https://github.com/user-attachments/assets/85358de8-0929-47fe-85f5-b53a59fb522e)

This plugin allows you to easily add filters to any query loop block.

Provides 2 new blocks that can be added within a query loop block to allow filtering by either post type or a taxonomy. Also supports using the core search block to allow you to search.

Compatible with both the core query loop block and the [Advanced query loop plugin](https://wordpress.org/plugins/advanced-query-loop/) (In fact, in order to use post type filters, use of the Advanced Query Loop plugin is required). 

Easy to use and lightweight, built using the WordPress Interactivity API.

## Usage

* Add a query block. This can anyhere that the query block is supported e.g. page, template, or pattern.
* Add one of the filter blocks and configure as required:
    * Taxonomy filter. Select which taxonomy to to use, customise the label (and whether it's shown), and customise the text used when none is selected.
    * Post type filter. Customise the label (and whether it's shown), as well as the text used when no filter is applied.
    * Search block. No extra options.
 
![image](https://github.com/user-attachments/assets/e2f9b62d-91f7-4c22-87ac-078b4d031a60)

## Installation

### Using Composer

This plugin is available on packagist.

`composer require humanmade/query-filter`

### Manually from Github. 

1. Download the plugin from the [GitHub repository](https://github.com/humanmade/query-filter).
2. Upload the plugin to your site's `wp-content/plugins` directory.
3. Activate the plugin from the WordPress admin.

Built assets are not committed to `main`. Manual or Composer installs should track the `release` branch (or a tagged release), which contains the compiled `build` directory.

## Local Development

This project uses [wp-env](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-env/) to run a lightweight, containerized WordPress instance at [localhost:3031](http://localhost:3031) for testing purposes. The default username for the localhost environment is `admin`, with the password `password`.

These commands can be used to interact with the environment:

Command | Purpose
---- | ----
`npm run env:start` | Start the local environment at http://localhost:3031
`npm run env:stop` | Turn off the local environment
`npm run env:cli -- wp ...` | Run WP-CLI commands within the environment
`npm run env:logs` | Open (and tail) the error logs for the application<sup>&ddagger;</sup>
`npm run env:db` | Open the database in the mysql command line
`npm run env:destroy` | Fully destroy the local environment (deletes container database)

<sup>&ddagger;</sup> This command deliberately filters out GET/OPTIONS/HEAD/POST/PUT access log entries

## Testing

End-to-end tests run against [WordPress Playground](https://wordpress.org/playground/), which boots in process — there is no environment to start or stop:

```bash
npm ci
npm run build   # tests run against build/, not src/
npm run test:e2e
```

Command | Purpose
---- | ----
`npm run test:e2e` | Run the Playwright suite
`npm run test:e2e:debug` | Step through tests in the Playwright inspector
`npm run test:e2e:watch` | Open the Playwright UI, rerunning on change
`npm run playground:start` | Boot the same environment for manual testing, without running tests

The environment is described by [blueprint.json](./blueprint.json) and is shared between the test run and manual use. See [tests/e2e/README.md](./tests/e2e/README.md) for the fixture content and how to write tests.

Every pull request also gets a **Preview in WordPress Playground** button added to its description, which boots that PR's build with demo content already in place — no local checkout needed to try a change.

## Release Process

Releases are cut by a manually-dispatched ["Release" GH Actions workflow](https://github.com/humanmade/query-filter/actions/workflows/release.yml), which builds the plugin, stamps the version into `query-filter.php`, and creates an immutable `vX.Y.Z` tag pointing at the built, versioned code. That tag is published to [Packagist](https://packagist.org/packages/humanmade/query-filter) and attached to a GitHub release as a downloadable ZIP.

To cut a new release:

1. Choose the target version number using [semantic versioning](https://semver.org/).
2. On the ["Release" GH Action page](https://github.com/humanmade/query-filter/actions/workflows/release.yml), click "Run workflow".
3. Fill out the "Version" field **without** a leading `v`, e.g. `1.2.3`.
4. Click "Run workflow".

There is no "prepare release" pull request — the version number is supplied to the workflow and never lives on `main`, where the `Version` header is always the literal placeholder `__VERSION__`.

Separately, merges to `main` automatically [build](https://github.com/humanmade/query-filter/actions/workflows/build-release-branch.yml) to the `release` branch. A project may track the `release` branch using [Composer](https://getcomposer.org/) to pull in the latest built beta version. The `release` branch is not versioned and is not involved in cutting a tagged release.

See [RELEASE.md](./RELEASE.md) for the full process, including what ships in the ZIP and how to cut a release by hand.
