# Homepage maintenance — 2026-09-06

## Loading findings and changes

- Nine original publication figures total 49,655,251 bytes. Several exceed 100 million pixels; VisPoison is 28,985 × 13,537 (392 million pixels). Small CSS display dimensions do not avoid decoding the original image.
- Cards now use 1,200px-wide WebP previews totaling 2,346,538 bytes (95.3% smaller). Encoding is lossless after resizing. The modal uses a separate image up to 2,400px wide; original PNG download links remain available.
- The portrait is now a 480px-wide, 43,826-byte WebP. The original portrait is retained.
- Crimson Text, Inter, and Kalam Latin fonts are served locally, avoiding the external Google Fonts CSS import and font requests. Family licenses are stored with the fonts.
- MapMyVisitors loads asynchronously on every visit. It is not deferred until the contact section, which would omit visitors who never scroll that far. The map's external provider can still be slow or unavailable.

## Repository and deployment cleanup

- Removed the inherited FUNDING.yml sponsorship of the template author and condensed the README. License and source attribution files remain.
- Hid empty Releases and Packages sections and enabled the canonical website link in repository metadata.
- GitHub Contributors is generated from existing commit authors. No hide switch is exposed in the repository sidebar editor. Historical commits have not been rewritten or reassigned.
- The failing check was Cloudflare Workers Builds, not Vercel. Its log showed Ruby 3.4.7 trying to start locked Bundler 2.2.19 and failing on DidYouMean::SPELL_CHECKERS. Its build command was also empty.
- The unused Worker had no custom domain/routes and both production and preview URLs were disabled. Its Git connection was disconnected to stop redundant automatic builds. The Worker itself, DNS, and GitHub Pages were not deleted.

## Verification

The homepage renders using the existing Liquid/Kramdown preview environment. Browser checks cover nine previews, larger modal images, original image links, local fonts, one asynchronous visitor script, no automatic original publication PNG requests, and desktop/mobile/sidebar layout. GitHub Pages is the full Jekyll build check. Byte reductions are asset-size measurements, not a claim that real-world load time improves by the same percentage.
