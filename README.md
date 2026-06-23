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

## Release Process

Merges to `main` automatically [build](https://github.com/humanmade/query-filter/actions/workflows/build-release-branch.yml) to the `release` branch. A project may track the `release` branch using [Composer](https://getcomposer.org/) to pull in the latest built beta version.

Commits on the `release` branch may be tagged for installation via [Packagist](https://packagist.org/packages/humanmade/query-filter) and marked as releases in GitHub for manual download, using a manually-dispatched ["Tag and Release" GH Actions workflow](https://github.com/humanmade/query-filter/actions/workflows/tag-and-release.yml).

To tag a new release:

1. Choose the target version number using [semantic versioning](https://semver.org/).
2. Check out a `prepare-v#.#.#` branch and bump the `Version` in the [query-filter.php](./query-filter.php) PHPDoc header.
3. Open a pull request titled "Prepare release v#.#.#".
4. Review and merge the "Prepare release" pull request.
5. Wait for the `release` branch to [update](https://github.com/humanmade/query-filter/actions/workflows/build-release-branch.yml) with the build that includes the new version number.
6. On the ["Tag and Release" GH Action page](https://github.com/humanmade/query-filter/actions/workflows/tag-and-release.yml):
   - Click "Run workflow" in the `workflow_dispatch` banner.
   - Fill out the "Version tag" field with your target version number. This must match the `Version` in `query-filter.php`. Use the format `v#.#.#`.
   - Click "Run workflow" to apply the specified tag to the `release` branch.

Once the workflow completes, the new version is [tagged](https://github.com/humanmade/query-filter/tags) and listed in [releases](https://github.com/humanmade/query-filter/releases).
