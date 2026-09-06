# Visitor statistics recovery record

Investigated 2026-09-06 using the complete local Git history (not a shallow clone).

## Original ClustrMaps tracker

Added in commit e3ad4060f7a419c957dd7c81e8a3d8a8b731ab71, dated 2025-12-04, in `_pages/about.md`.

- Statistics page: https://clustrmaps.com/site/1buji
- Site ID: `1buji`
- Embed key: `8FvmiF-Ze-Y-aFCJrTdqv0-ObHOkMPnPj1hOWXH7ayU`

Original embed:

```html
<a href='https://clustrmaps.com/site/1buji' title='Visit tracker'><img src='//clustrmaps.com/map_v2.png?cl=ffffff&w=500&t=n&d=8FvmiF-Ze-Y-aFCJrTdqv0-ObHOkMPnPj1hOWXH7ayU&co=747f93&ct=ffffff'/></a>
```

## Replacement MapMyVisitors tracker

Commit 8c519f41f9dcbe1f9247beeec1816637c3c88ab5, dated 2026-07-28, replaced that embed with:

```html
<script type="text/javascript" id="mmvst_globe" src="https://mapmyvisitors.com/globe.js?d=Ujm_BmP8mUaSYU6847AdUYd5MA8HkXze5ujsctAsI04"></script>
```

The initial redesign retained this MapMyVisitors identifier. No historical visit counts were stored in the old homepage markup; no dedicated visitor-data export was found in the examined history. Google Analytics ID is currently unset.

## What is and is not established

- The tracker code changed providers before this redesign. The Git diff contains no migration operation.
- Direct requests to the old ClustrMaps page/image failed with a TLS connection error. Browser navigation was blocked by its site-safety policy; no bypass attempted.
- The previous MapMyVisitors widget did not return counts during testing. This does not prove deletion of the provider's database.
- Community reports describe ClustrMaps outages and missing history, but do not establish an official migration or the status of this account: https://www.reddit.com/r/website/comments/1twil4j/clustrmapscom_seems_to_be_completely_dead_down/

## Recovery prerequisites

Check the original service account or registration emails for the site ID above, archived maps, or exported statistics. If the provider still has the records, request an export or restoration for `https://zwanah.github.io/` and site `1buji`. A saved map image can preserve a historical snapshot but cannot reconstruct raw visits. Restoring the old embed alone cannot recover server-side records. No replacement tracker/account was created during this investigation.

## Current configuration (2026-09-06)

The owner supplied a new MapMyVisitors embed for the canonical homepage `https://wanzhuoyue.com`. The homepage now uses key `BaqRYnYzdyYOpYiBOwrZApLSRdeRj8OmuhxCm4DJgSo` and links to statistics at https://mapmyvisitors.com/web/1c821. The existing HTTPS compatibility script and 300px map layout are retained. This configuration change does not establish that previous visitor history was migrated.
