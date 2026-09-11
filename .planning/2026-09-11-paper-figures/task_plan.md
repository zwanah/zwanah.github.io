# Add XOver and CARGO paper figures

## Goal

Replace the two placeholder figures on the first two publication cards with the supplied XOver and CARGO PDFs, using the site's existing lightweight WebP preview/large-image pattern.

## Phases

- [x] Inspect existing publication asset pipeline and source PDFs.
- [x] Render PDFs and create original/preview/large image assets.
- [x] Update publication data without disturbing existing user edits.
- [x] Validate file sizes, dimensions, references, and the rendered site.

## Next Step

Deliver the updated assets and publication mappings.

## Errors

| Error | Attempt | Resolution |
|---|---:|---|
| `bundle exec jekyll build` could not find locked Bundler 2.2.19 under system Ruby 2.6 | 1 | Use the repository's documented local preview/static validation path; do not alter dependency locks for this asset-only change. |
| First asset-reference check used Ruby 2.7-only `filter_map` on Ruby 2.6 | 1 | Replaced it with Ruby 2.6-compatible iteration before rerunning the check. |
