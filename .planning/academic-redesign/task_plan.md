# Academic homepage redesign

## Phases
- Inspection and design direction: complete
- Implement restrained, responsive academic layout: complete
- Render and verify content/structure: complete
- Desktop first-screen visual check: complete
- Remaining browser checks: completed during follow-up

## Next Step
Deliver restructured homepage; await valid statistics embed for visitor count data.

## Errors
- System Ruby lacks locked Bundler 2.2.19; inspect available runtimes before build.
- Initial read used an unmatched workflow glob; repeat with exact files.

- Jekyll dependency installation failed because latest ffi requires Ruby >= 3; used the repository-locked Liquid/Kramdown/GFM versions for preview rendering. Full Jekyll pipeline remains unverified.
- Browser click approval timed out twice, including the one permitted retry. No alternate UI route attempted.

## Follow-up: publication components
- Inspect reference: complete
- Implement larger publication components and figure viewer: complete
- Verify rendered structure and responsive views: complete

## Follow-up: AcaNova-X architecture
- Inspect template architecture and verify PolyU address: complete
- Sidebar profile, bilingual name, contact map, original visitor widget: complete
- Responsive and map validation: complete
- Visitor count data: pending working provider embed (user asked)

## Follow-up: reuse upstream template and venue marks
- Template CSS and component integration: complete
- Section icons, Research Thrust, detailed News: complete
- Official conference logo acquisition: complete
- Desktop/mobile and content validation: complete
