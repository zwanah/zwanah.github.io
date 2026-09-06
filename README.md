# Zhuoyue Wan's Academic Homepage

Personal website of Zhuoyue Wan (万卓越), a Ph.D. candidate in Computer Science at The Hong Kong Polytechnic University.

**Website:** [wanzhuoyue.com](https://wanzhuoyue.com)

## Editing the site

- Biography, research, education, honors, and contact: `_pages/about.md`
- Publications and figure paths: `_data/publications.yml`
- News: `_data/news.yml`
- Profile and canonical domain: `_config.yml`
- Layout and styles: `_layouts/academic.html`, `assets/css/academic.css`
- Figure viewer, responsive sidebar, and visitor map loading: `assets/js/academic.js`

The site is built with Jekyll and published by GitHub Pages from `main`. `CNAME` sets the custom domain. For a local preview with the required Ruby dependencies installed, run `bundle install` and `bundle exec jekyll serve`.

## Media and performance

Publication cards use reduced-resolution WebP previews, and the figure viewer loads a larger WebP only on request. Original PNGs remain available through the viewer's original-image link. Keep `image` (original), `preview`, and `display` paths together when adding a paper. Use `preview_width` and `preview_height` for the thumbnail dimensions.

Fonts are hosted locally with their licenses in `assets/fonts/homepage`. The campus map is lazy-loaded; MapMyVisitors loads asynchronously on every page visit so that visitors are counted even if they do not scroll to Contact. Visitor statistics depend on the external provider and display an unavailable message if no count is returned.

## Source credits

The original Jekyll structure derives from [AcadHomepage](https://github.com/RayeRen/acad-homepage.github.io), and the current design includes styles adapted from [AcaNova-X](https://github.com/yihangtao/yihangtao.github.io). Original licenses and asset source notes are retained in `LICENSE` and the relevant `assets` directories.
