# Strata - Price Memory Atlas

**Most Beautiful On-Chart Indicator · #TSBuild26**

History leaves a shape. Strata reveals it through layered price contours and three aligned closing-price distributions.

The terrain maps the previous 60 closes into historical percentiles. Teal and amber paths track the 20- and 120-bar medians. The atlas compares all three windows on identical price bins and density scales, showing where recent prices have gathered and how that differs from the longer sample.

Read it in three steps:

1. Compare the recent teal median with the amber base median.
2. See whether the 20-, 60- and 120-bar distributions overlap or separate.
3. Use the dotted completed-close marker, historical close rank and middle-half overlap to put the relationship into numbers.

“Recent above base” means the recent middle-half price range lies entirely above the 120-bar middle-half range. “Recent below base” means the reverse. These describe observed history; they are not buy/sell instructions.

Use Ink on a dark chart, Paper on a light chart, and Compact when space is limited. Hide contours and median paths separately. Reposition the atlas using its native overlay EDIT control.

**Starting configuration:** Daily, regular hours, standard candles. Windows count bars, so other timeframes change their duration. The full atlas needs 121 bars. Every calculation excludes the current bar, even when the market is closed.

**Calculation notes:** equal-weight closing prices; linearly interpolated sample quantiles; 32 shared histogram bins; midrank for ties; middle-half intersection divided by union for overlap. Profiles do not represent traded volume, investor holdings or cost basis. Bin choice, timeframe, session, chart history and corporate-action adjustments affect the picture. Vendor revisions can change the history.

MIT open source. No external requests, API key, forecast, trade signals or trading-return claim.

---

Draft only. Attach actual native screenshots and check thumbnail readability before publishing. Use the exact title above in the final form. No publication or submission has occurred automatically.
