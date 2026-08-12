# Release Process

This document describes the release process for the Query Loop Filters plugin.

## Overview

Releases are cut by the **`Release`** GitHub Actions workflow
(`.github/workflows/release.yml`), triggered manually from the Actions tab.

The workflow does everything *before* the tag exists, then creates the tag
once and never touches it again:

1. Validates the version you supplied (must be `X.Y.Z`).
2. Builds the production assets (`npm ci && npm run build`).
3. Stamps the version into `query-filter.php` (replaces `__VERSION__`).
4. Commits the built assets + stamped version and **creates an annotated tag
   `vX.Y.Z` pointing at that commit**.
5. Pushes the tag — once, never force-pushed.
6. Builds the distribution ZIP with `git archive` and publishes a GitHub
   release with auto-generated notes.

Because the tag is created already-built and already-versioned, it is
**immutable**. This is what Packagist requires: Packagist rejects tag updates,
so the tag must never be moved after it is first published.

## Creating a release

1. Make sure `main` is green and contains the code you want to ship.
2. Go to [**Actions → Release → Run workflow**](https://github.com/humanmade/query-filter/actions/workflows/release.yml).
3. Enter the version **without** a leading `v` (e.g. `1.2.3`).
4. Run it.

There is no "prepare release" pull request to open — the version number is
supplied to the workflow and never lives on `main`.

The workflow will fail fast if the tag already exists — tags are immutable, so
bump the version instead of trying to re-release.

## Version numbering

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backwards compatible

The version on `main` is always the literal placeholder `__VERSION__`; the real
number only ever exists inside a release tag. This keeps `main` free of version
churn and guarantees the version in a tag matches the tag name.

## What gets released

The ZIP is produced with `git archive`, which honours the `export-ignore`
rules in `.gitattributes`. That file is the **single source of truth** for what
ships. Currently included:

- `query-filter.php` (with the version stamped in)
- `build/` (compiled assets, including the block `render.php` partials)
- `inc/`
- `composer.json`

Everything marked `export-ignore` in `.gitattributes` (dev tooling, sources,
tests, docs) is excluded. To change what ships, edit `.gitattributes` — nothing
in the workflow needs to change.

## Packagist

Packagist publishes new tags automatically (via the GitHub webhook /
auto-update). Since every `vX.Y.Z` tag is immutable and self-contained, no
manual intervention or tag rewriting is ever required. If a release was wrong,
**publish a new patch version** rather than attempting to move a tag.

## The rolling `release` branch

`.github/workflows/build-release-branch.yml` keeps a `release` branch in sync
with `main` plus committed `build/` assets on every push to `main`. This is
useful for tracking the latest built code directly from a branch, but it is
**not** part of cutting a tagged release — the `Release` workflow builds fresh
from `main`. The `release` branch carries the `__VERSION__` placeholder and is
not a versioned artifact.

## Troubleshooting

### "Tag already exists"

This is by design — tags are immutable. Bump to the next version and run the
workflow again.

### Build fails

Check the workflow logs. The build runs `npm ci && npm run build`; make sure
`main` builds cleanly and `package-lock.json` is committed.

### ZIP missing files / contains dev files

Adjust the `export-ignore` entries in `.gitattributes`. The ZIP is generated
straight from the tagged tree via `git archive`, so it always matches what is
in the tag.

## Manual release (fallback)

If you ever need to cut a release by hand:

```bash
# from a clean checkout of the commit you want to ship
npm ci && npm run build
sed -i "s/__VERSION__/1.2.3/g" query-filter.php
git add -f build query-filter.php
git commit -m "Release v1.2.3"
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin refs/tags/v1.2.3          # push the tag ONCE; never force-push

# package it
git archive --format=zip --prefix=query-filter/ -o query-filter-v1.2.3.zip v1.2.3
```

Then attach the ZIP to a GitHub release created from the tag.
