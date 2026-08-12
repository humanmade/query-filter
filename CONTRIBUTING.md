# Contributing.

## Building assets

Run `npm run build` to build production assets, or `npm run start` whilst actively working on the plugin.

Built assets are gitignored and must not be committed. They are built by CI: merges to `main` build to the `release` branch, and the release workflow builds them fresh when cutting a tag.

## Releasing a new version

Releases are cut by the manually-dispatched ["Release" GH Actions workflow](https://github.com/humanmade/query-filter/actions/workflows/release.yml): run it with the target version number (without a leading `v`) and it builds, stamps the version, tags, and publishes the GitHub release and Packagist version for you.

See [RELEASE.md](./RELEASE.md) for the full process.
