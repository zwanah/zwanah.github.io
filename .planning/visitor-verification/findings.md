# Visitor verification

2026-09-07: Fresh headless Chrome context loaded the live canonical homepage and obtained HTTP 200 from local embed script, jQuery, widget_call_home.js, map background, and ajax/map. Provider DOM showed 1 Pageview, unavailable fallback hidden. Screenshot: /tmp/live-visitor-statistics.png. Plain urllib requests to MapMyVisitors timed out (12-20s); this alone does not establish the cause of another computer failing. No access to the affected second computer.

Fixed misleading initial unavailable label: show loading first, failure message after 15 seconds, and clear it when a valid count (including zero) arrives. Browser test passed initial/timeout/late-response states. Commit b6e95d1 pushed.
