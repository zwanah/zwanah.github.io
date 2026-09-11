# Progress

- 2026-09-11: Inspected the repository, existing publication records, image dimensions, performance notes, and both source PDFs. Confirmed the two current cards use placeholder images.
- 2026-09-11: Preserved pre-existing user changes in `_data/news.yml`, `_data/publications.yml`, and the existing `.planning/` tree.
- 2026-09-11: Rendered both PDFs at 300 dpi. Used XOver's CropBox to remove the PDF's unintended A4 whitespace; visually checked the complete framework. Created 1200px preview and 2400px display WebPs with lossless encoding.
- 2026-09-11: YAML, dimensions, WebP lossless metadata, and expected publication paths validated. Full `bundle exec jekyll build` was attempted but is blocked by the pre-existing locked Bundler 2.2.19/system Ruby mismatch.
- 2026-09-11: Final assertions passed for all 11 publication records and 33 referenced assets; the include still uses lazy 1200px previews and deferred display images. `git diff --check` passed.
