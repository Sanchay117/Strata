# Native Strata verification · October 23, 2026

Private indicator: **Strata - Price Memory Atlas**. Source corresponds to `dist/strata.trendspider.js`; its digest is in `dist/build.json`. Nothing was published to the Store or submitted to the competition.

## Confirmed in TrendSpider

- Compiled, painted contours and both median paths, rendered all three Chart.js profiles, and saved the source privately. The editor showed no unsaved changes after the final save.
- Ink / Full rendered with a fully visible atlas on the dark native CVX chart. Completed reference 226.78; medians 209.56 / 205.76 / 192.47; displayed median shift +8.9%; middle-half overlap 0%; close rank 99.6/100.
- Paper / Compact rendered natively. This checked the Paper card and dynamic palette change on the existing dark chart, not a complete switch of TrendSpider to its light theme. The local Paper renderer was separately checked on a light background.
- Switched the native stock to AAPL. The atlas updated its symbol, medians and distributions: reference 343.99; medians 338.95 / 329.86 / 313.00; median shift +8.3%; overlap 0%; rank 99.6/100.
- Switched to NKE and confirmed **RECENT BELOW BASE**: reference 37.53; medians 35.38 / 37.70 / 41.77; shift -15.3%; overlap 0%; rank 24.6/100. This verifies a different native descriptive state, not a bearish trade signal.
- Actual screenshots are retained in `screenshots/`. The native feed differs from the dated local-review cache; their numbers should not be expected to match.

## Platform issues found and fixed

1. `responsive: false` left native Chart.js canvases at 300×150 while their cells were only 46px high. This made profiles overflow each other. Using responsive charts with a fixed container height and `maintainAspectRatio: false` corrected it.
2. The native overlay sanitizer/layout did not align inline floated spans reliably. Small nested tables now provide the two-column labels and price-axis endpoints.
3. Chart styles persist scalar default colors. Line colors are now series arrays so switching the palette updates the native lines. Shared fill colors are intentionally constant. Individual line editors are hidden; appearance is controlled by the named inputs.
4. Native overlay position settings persist independently of source defaults. The existing card's saved X offset was updated from 12 to 48 to keep its edge visible. Position is controlled through the native overlay EDIT dialog, avoiding a redundant input that could conflict with the persisted style.

For the Strata review, the chart-only Aegis overlay, SMA50, lowest-low anchored VWAP80 and yearly relative-performance panel were removed from the current chart layout. Their private library records were not deleted. Volume and earnings markers were retained.

## Scope and remaining review

The local six-symbol fixture checks cover rising, falling and overlapping distributions; tests also cover flat, missing and short histories. Local Paper rendering and a historical replay to December 16, 2025 were visibly checked. Hiding contours reduced the SVG line count from eleven to the two median paths. Calculation QA is recorded in `validation.json`. Functional and visual checks are separate from trading performance; Strata is not a strategy.

Native light-chart rendering, additional resolutions, Store thumbnail readability and the final public listing should receive a final review before publication. No claims of universal native compatibility, complete competitive uniqueness or prize odds are supported by these checks.
