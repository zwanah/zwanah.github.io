# Findings

- The first publication record is XOver but currently points to the OsmT figure; the second is Text-to-RLS but currently points to the TransFlower figure.
- `academic-paper.html` loads `preview` lazily for cards and `display` only for the enlarged viewer; `image` is the original figure link.
- Existing optimized card previews are 1,200 px wide WebP files; large viewer assets are separate WebP files, generally up to 2,400 px wide. Original PNGs remain under `images/`.
- The supplied PDFs are single-page vector documents: XOver is 803.025 × 443.448 pt and the previous CARGO source was 1026 × 554 pt. Their source PDFs were small, but the website should still use rasterized WebP assets for predictable browser decoding.
- Existing maintenance notes document that the optimized preview pattern was introduced specifically to avoid decoding very large original figures on the homepage.
- XOver must be rasterized with Poppler's `-cropbox`: its MediaBox is A4 landscape while its CropBox is the intended 803.025 × 443.448 pt figure area. CropBox rendering produces a tight 3346 × 1848 source PNG at 300 dpi.
- The previous CARGO figure rendered directly to 4275 × 2309 at 300 dpi. Its replacement Text2RLS PDF has a tight 1104 × 389 pt CropBox and renders to 4600 × 1621 at 300 dpi. Generated lossless WebP pairs are Text2RLS 1200 × 423 / 2400 × 846.
