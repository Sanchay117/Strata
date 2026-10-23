# Strata · Price Memory Atlas

A native TrendSpider visual indicator for **Most Beautiful On-Chart Indicator**. Strata compares closing-price distributions over 20, 60 and 120 bars and turns their historical spread into layered price contours.

**Working private prototype. Not published or submitted.** This folder is its own Git repository; other category folders are outside it. Repository: [Sanchay117/Strata](https://github.com/Sanchay117/Strata).

## Read the atlas

- **Terrain:** nine contours mark the 5th, 15th, 25th, 35th, 50th, 65th, 75th, 85th and 95th percentiles of the preceding 60 closes. Central shading identifies the middle of that historical sample. These are sample quantiles, not future probability bands.
- **Terrain colors:** violet/blue identify lower historical price percentiles, cyan/mint the center, and gold/coral the higher percentiles. The 60-bar median is violet; teal and amber paths distinguish the 20- and 120-bar medians. An on-card key explains the spectrum. Colors express rank within observed prices, not bullish/bearish forecasts.
- **Teal path:** median of the preceding 20 closes. **Amber path:** median of the preceding 120 closes.
- **Three profiles:** 32-bin histograms of the preceding 20, 60 and 120 closes, with equal weight per bar. All three have identical price bins and vertical scales; height is the fraction of that sample in a bin.
- **Solid profile marker:** its median. **Dotted marker:** the preceding bar's close, common to all profiles.
- **Median shift:** `median20 / median120 - 1`.
- **IQR overlap:** intersection length divided by union length of the 20- and 120-bar middle-half price ranges. Identical point ranges count as 100% overlap.
- **Recent above/below base:** the 20-bar middle-half range is entirely above/below the 120-bar middle-half range. Otherwise the memories overlap. These are descriptive states, not trade instructions.
- **Close rank:** fraction of 120 observations below the reference close, plus half the fraction equal to it. Ties receive a midrank.

The indicator does not observe investor holdings, cost basis, order flow or traded volume at price. It makes no claim about support/resistance certainty or future returns. The histogram picture depends on the 32-bin choice, timeframe, session and price adjustments.

## Install in TrendSpider

1. Open a standard candlestick chart. Daily/RTH is the starting review configuration. Windows count **bars**, not calendar days.
2. In **Custom Indicator Editor**, create a new indicator and paste the complete [standalone script](dist/strata.trendspider.js).
3. Apply, then Save as **Strata - Price Memory Atlas**. The native script needs no packages, API keys, imports or external service.
4. Choose **Ink** for a dark chart, **Paper** for a light chart, and **Full** or **Compact** for the atlas. The palette input changes the indicator, not the chart's theme. Contours and median paths can be hidden separately.
5. Reposition through Manage Indicators → Strata atlas → **EDIT**. Initial placement: Bottom Left, X offset 48, Y offset -10. TrendSpider persists style overrides; editing a source default does not overwrite an existing chart's position.

The full atlas requires 121 loaded bars. Short or invalid/nonpositive price histories display a clear message and gaps instead of fabricated observations. Intended for positive-priced symbols. Native overlay indicators do not support the secondary timeframe mode.

Output at bar `i` uses closes `[i-window, i)` and reference `close[i-1]`. The current bar is always excluded, even after market close. Nothing is projected forward or backdated. Vendor revisions and changed history boundaries can change a recomputation. The atlas card is a latest-window snapshot; use the local tool for historical replay.

## Run and verify

Node 20+ and Python 3; no npm dependencies or installation step.

```sh
cd /Users/sanchaysingh/Desktop/Hackathons/TrendSpider/04-on-chart-visuals
npm run check
npm run qa
npm run preview
```

Open [the local review tool](http://127.0.0.1:8766/preview/): six dated symbol samples, Ink/Paper palettes, contours, historical replay and source. It reuses the engine and atlas definition with an SVG preview renderer. It is explicitly not a native screenshot. Cached public daily data ends October 19, 2026; native TrendSpider uses its own feed and can differ.

Tests cover hand-calculated quantiles/ranks, histogram mass, exact boundaries, prefix causality, current-bar stability, flat/missing histories, scale invariance and stable native plots across appearances. QA verifies fixture hashes and common axes and records calculation time on 7,000 synthetic bars. These checks do not establish profitability or competition odds.

See [native verification](review/NATIVE-QA.md), [competitive research](review/COMPETITION.md), and [Store listing draft](submission/store-description.md).

## Submission

Deadline: **October 26, 2026**, per the supplied [final form](https://docs.google.com/forms/d/e/1FAIpQLSdOi84k_GXCS3h-YxDqruye0uGAi6cqteRWK-QUoYx3VmItTA/viewform). Publish a public, free, original, open-source Store indicator with published source and `#TSBuild26`, then complete the form. Both actions remain outstanding.

The [rubric](https://drt8s3xkrl8yg.cloudfront.net/1/assets/pdf/hackathon/2026_How_You_Are_Judged.pdf) assigns 60% to visual impact and 40% to clarity for this category. Accurate calculations and native readability remain essential.

[MIT License](LICENSE). Conventional statistical methods; original implementation/presentation. No new-mathematics or global-uniqueness claim.
