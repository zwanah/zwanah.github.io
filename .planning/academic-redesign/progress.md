# Progress
- Inspected existing content, configuration and layout; working tree initially clean.
- Chose a standalone academic Jekyll layout to avoid legacy CSS and JS collisions.
- Implemented standalone layout, responsive CSS, semantic publication and news data, preserved all 9 papers.
- Build attempt needs a writable gem spec cache; retrying with a temporary cache and gem directory.
- Rendered with locked Liquid 4.0.3, Kramdown 2.3.1 and GFM 1.1.0 using a temporary renderer.
- Desktop first screen visually verified. Fixed Markdown list closing tags found in accessibility inspection.
- Further browser checks blocked by two automatic approval timeouts.
- Static validation passed: all original publication titles, authors, figures, venue details and paper URLs preserved; 9 papers, 8 news, 4 education and 7 honors entries.
- Corrected list-container indentation after validation caught nested sections. Final rendered HTML has 6 sibling sections, unique IDs, valid fragment targets and existing local assets, with no leaked Markdown/HTML/Liquid.
- Disabled empty analytics include on the new layout when no analytics ID is configured.
- Added narrow-screen fallback at 380px and maintenance notes; git diff --check passed.
- Local preview available at http://localhost:4000. Full Jekyll build and remaining interactive/mobile visual checks not verified; browser access requires resolution of approval timeout.

## Follow-up: large publication components
- Read reference live CSS/JS and inspected reference card screenshot. Compared raw GitHub main files: both match deployed files.
- Implemented original Jekyll component with large left figure, restrained venue badge, larger serif title, resource controls and native dialog with Escape, close control, focus restoration and normal image-link fallback.
- Desktop 1280px: figure width 415px (previously 152px); 390px mobile: stacked 344px image; 320px: overflow check passed.
- Desktop and mobile layouts visually inspected. Dialog opens with correct full-resolution image and close-button focus; Escape restores focus/scroll; mobile close button verified.
- All 9 publication records preserved; static HTML checks, JavaScript syntax and diff whitespace passed. Full Jekyll dependency build limitation remains from the initial environment; preview uses locked Liquid/Kramdown.

## Follow-up: complete architecture
- Removed Shanghai caption and hero; added bilingual profile (万卓越 / Russell), fixed desktop sidebar, research interests, original affiliations and profile links.
- Rebuilt page styles around AcaNova-X two-column structure, modular paper cards and paired contact panels. All papers/news/education/honors retained.
- Added verified PolyU main-campus location map and restored original visitor ID. Google Maps visibly loads on desktop/mobile; statistics map loads but counts remain unavailable from provider.
- Preview server restarted after connection refusal; stale browser error tab replaced. Desktop and 390/320px mobile inspected; no horizontal overflow and old caption absent.
- Pending external dependency: working MapMyVisitors/ClustrMaps embed if old ID remains unavailable. Prompt sent to user; no counts fabricated.
- Contact alignment refinement: shared 64px title / 270px visual / 72px footer tracks (240px visuals on mobile), matched padding and centered headings. Browser measured both outer panels at 408px and both visual tops at the same coordinate. Prevented provider loading background from tiling when expanded.

## 2026-09-06: direct template adoption
- Vendored upstream AcaNova-X styles with MIT license; adapted Jekyll markup and component styling.
- Added section icons and Research Thrust; expanded all eight existing news entries with grounded titles/authorship and celebration icons.
- Added nine venue marks. SIGMOD 2027, ICDE 2025/2026, EMNLP 2026, ACL 2026 sourced from official conference sites. ICDE 2025 exported from browser page assets after direct download returned 403. Elsevier is explicitly labelled as publisher; preprints use arXiv.
- Office Address title updated. All nine original publication records preserved; local assets/anchors, JavaScript syntax and git diff whitespace checked. Desktop and 390px mobile visually checked, no horizontal overflow; contact visuals remain equal height.
- Full Jekyll build still unavailable in system Ruby environment; preview uses previously documented locked Liquid/Kramdown renderer. Visitor data provider still requires working data response.

## Profile and component refinements
- Applied ten browser comments: Address, LLM/VLM quality-model interests, explicit data-centric tasks, 2027 visiting/exchange and long-term collaboration callout, Education-only section with RA removed.
- Added official PolyU/HKUST/CQU logo assets and upstream timeline structure. Honors now uses upstream date/content columns with English month dates, sorted newest first.
- Fixed map clipping by rendering at the provider's fixed 300px geometry and scaling the complete widget for narrow panels; map windows share a compact 180px height.
- Reference provider counter verified live (324 pageviews). Own identifier still leaves JSONP request pending/no count, even over HTTPS. Added local provider compatibility copy with HTTPS endpoint URLs. No reference visitor data reused or invented.
- Content assertions, JS syntax and whitespace checks pass; desktop education/contact visually inspected.

## Typography, icons and figure sizing
- Replaced four profile text links with local Font Awesome SVG icons, retaining accessible names and original destinations; included upstream icon license.
- Removed figure minimum heights and caption bars; thumbnails now follow intrinsic image proportions at every breakpoint.
- Publication venues now render full names followed by short gold badges, without Accepted at prefix. Original detail metadata remains in data for provenance.
- School tiles now display only the symbol through CSS viewports of official university assets (no stretched or recreated marks).
- Unified regular copy to Inter, kept Crimson Text display headings and Kalam News consistent with the reference's font roles; normalized sizes and line spacing.
- Rendered content and JavaScript syntax checks pass.

## Research topic icons and campus pin
- Renamed sidebar to NLP & Data and added local Font Awesome database/layers/robot icons in matching gold, with template-style divider and aligned rows.
- Changed the requested LLM/VLM and research heading to MLLM; updated EMNLP/ACL full display names, preserving Findings badges.
- Map now queries PolyU at 11 Yuk Choi Road with an explicit main-campus center and zoom17. Browser screenshot confirms a red Hong Kong Polytechnic University pin at the center, rather than Hung Hom station.
- Render assertions and diff check passed; desktop icon and map visual check passed.

## Publication ranking badges
- Added independent CCF-A badges after SIGMOD/ICDE abbreviations (four papers), JCR-Q1 after MIA; removed year suffixes from MIA and both arXiv badges.
- Findings papers remain labelled Findings without CCF rank: CCF official directory explicitly excludes Findings (https://www.ccf.org.cn/Academic_Evaluation/By_category/).
- Render assertions verify badge counts and year removal; git diff check passes.
