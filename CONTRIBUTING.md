# Contributing.

## Building assets

Run `npm run build` to build production assets, or `npm run start` whilst actively working on the plugin.,

There is currently no automated process to build assets when releasing, so please commit updated build files as part of any pull request. This is something we can revisit later if it becomes an issue.

## Releasing a new version

[Releases are managed using Github.](https://github.com/humanmade/query-filter/releases).

Create a new release setting the tag to the desired version number (Follow semver for major/minor releases). Target should be main and release notes can be auto-generated. Use the version number as the release title.

Once a release is created, it will be published automatically on Packagist.
