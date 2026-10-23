/* Strata - Price Memory Atlas | MIT License | #TSBuild26
 * Visual category. Historical closing-price context; no trading-return claim.
 */

// src/engine.js
/* Strata: observed closing-price distributions, equally weighted by bar.
 * Output at index i uses ONLY prices at indices < i. No current candle,
 * volume-at-price approximation, holder-cost claim, prediction, or trade signal.
 * Linear sample quantiles: index = probability * (sample size - 1).
 */
const STRATA_HORIZONS = Object.freeze([20, 60, 120]);
const STRATA_QUANTILES = Object.freeze([0.05, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.95]);

function strataQuantile(strataSorted, strataProbability) {
  if (!strataSorted.length || strataProbability < 0 || strataProbability > 1) return null;
  const strataIndex = (strataSorted.length - 1) * strataProbability;
  const strataFloor = Math.floor(strataIndex);
  return strataSorted[strataFloor] + (strataSorted[Math.ceil(strataIndex)] - strataSorted[strataFloor]) * (strataIndex - strataFloor);
}

function strataRank(strataSorted, strataPrice) {
  let strataBelow = 0;
  let strataEqual = 0;
  for (const strataValue of strataSorted) {
    if (strataValue < strataPrice) strataBelow += 1;
    else if (strataValue === strataPrice) strataEqual += 1;
  }
  return strataSorted.length ? (strataBelow + 0.5 * strataEqual) / strataSorted.length : null;
}

function strataHistogram(strataValues, strataMinimum, strataMaximum, strataBins = 32) {
  const strataCounts = Array(strataBins).fill(0);
  const strataSpan = strataMaximum - strataMinimum;
  if (!(strataSpan > 0) || strataBins < 2) throw Error('Strata: invalid histogram range.');
  for (const strataValue of strataValues) {
    const strataBin = Math.min(strataBins - 1, Math.max(0, Math.floor((strataValue - strataMinimum) / strataSpan * strataBins)));
    strataCounts[strataBin] += 1;
  }
  return strataCounts.map((strataCount, strataBin) => ({
    x: strataMinimum + (strataBin + 0.5) / strataBins * strataSpan,
    y: strataValues.length ? strataCount / strataValues.length : 0
  }));
}

function calculateStrata(strataPrices) {
  if (!Array.isArray(strataPrices)) throw Error('Strata: close must be an array.');
  const strataLength = strataPrices.length;
  const strataContours = STRATA_QUANTILES.map(() => Array(strataLength).fill(null));
  const strataMedians = STRATA_HORIZONS.map(() => Array(strataLength).fill(null));
  let strataLatest = null;
  for (let strataBar = 20; strataBar < strataLength; strataBar += 1) {
    const strataSamples = STRATA_HORIZONS.map(strataHorizon => {
      if (strataBar < strataHorizon) return null;
      const strataWindow = strataPrices.slice(strataBar - strataHorizon, strataBar);
      return strataWindow.every(strataValue => Number.isFinite(strataValue) && strataValue > 0)
        ? strataWindow.sort((strataA, strataB) => strataA - strataB) : null;
    });
    for (let strataH = 0; strataH < 3; strataH += 1) {
      if (strataSamples[strataH]) strataMedians[strataH][strataBar] = strataQuantile(strataSamples[strataH], 0.5);
    }
    if (strataSamples[1]) {
      for (let strataQ = 0; strataQ < 9; strataQ += 1) strataContours[strataQ][strataBar] = strataQuantile(strataSamples[1], STRATA_QUANTILES[strataQ]);
    }
    if (strataBar !== strataLength - 1 || !strataSamples.every(Boolean)) continue;
    const strataReference = strataPrices[strataBar - 1];
    const strataMinPrice = strataSamples[2][0];
    const strataMaxPrice = strataSamples[2][119];
    const strataPadding = Math.max((strataMaxPrice - strataMinPrice) * 0.08, strataReference * 0.005);
    const strataProfiles = strataSamples.map((strataSorted, strataH) => ({
      horizon: STRATA_HORIZONS[strataH],
      median: strataQuantile(strataSorted, 0.5),
      q25: strataQuantile(strataSorted, 0.25),
      q75: strataQuantile(strataSorted, 0.75),
      rank: strataRank(strataSorted, strataReference),
      histogram: strataHistogram(strataSorted, strataMinPrice - strataPadding, strataMaxPrice + strataPadding),
      sample: strataSorted
    }));
    const strataRecent = strataProfiles[0];
    const strataBase = strataProfiles[2];
    const strataIntersection = Math.max(0, Math.min(strataRecent.q75, strataBase.q75) - Math.max(strataRecent.q25, strataBase.q25));
    const strataUnion = Math.max(strataRecent.q75, strataBase.q75) - Math.min(strataRecent.q25, strataBase.q25);
    const strataOverlap = strataUnion > 0 ? strataIntersection / strataUnion : 1;
    const strataState = strataRecent.q25 > strataBase.q75 ? 'RECENT ABOVE BASE'
      : strataRecent.q75 < strataBase.q25 ? 'RECENT BELOW BASE' : 'MEMORIES OVERLAP';
    strataLatest = { index: strataBar, completedIndex: strataBar - 1, reference: strataReference,
      minimum: strataMinPrice - strataPadding, maximum: strataMaxPrice + strataPadding,
      profiles: strataProfiles, overlap: strataOverlap, state: strataState,
      migration: strataRecent.median / strataBase.median - 1,
      flat: strataMaxPrice === strataMinPrice };
  }
  return { contours: strataContours, medians: strataMedians, latest: strataLatest,
    status: strataLength < 121 ? 'Load at least 121 bars' : strataLatest ? 'READY' : 'Missing or nonpositive prices in the last 120 completed bars' };
}


// src/presentation.js
const STRATA_PALETTES = Object.freeze({
  Ink: { background: '#0d1b25', text: '#eef4f3', muted: '#9bb0ba', border: '#29404c', contour: '#4d9ea5', recent: '#62e3ce', middle: '#cfb5ff', base: '#ffd08b', plot: '#0a141c',
    levels: ['#ae87f4', '#8e9bff', '#65b9f8', '#56d8dc', '#cfb5ff', '#9be3b6', '#f0d28b', '#f3ac7d', '#ef8fa0'] },
  Paper: { background: '#f4f1e8', text: '#1c343d', muted: '#536e75', border: '#c8d3cf', contour: '#187f88', recent: '#006e66', middle: '#713da5', base: '#945714', plot: '#faf8f1',
    levels: ['#7541b9', '#5256b7', '#276ea6', '#087d88', '#713da5', '#277a51', '#936518', '#ab5b29', '#ac3e63'] }
});
// Constant fill colors have stable native styles; per-theme line colors are dynamic.
const STRATA_LAYER_COLORS = Object.freeze(['#9470e8', '#6f8eea', '#42add8', '#42c6c1', '#8dce9c', '#d8bf6f', '#e0a16c', '#df8497']);
const STRATA_LAYER_OPACITIES = Object.freeze([0.09, 0.13, 0.17, 0.23, 0.23, 0.17, 0.13, 0.09]);

function strataEscape(strataText) {
  return String(strataText).replace(/[&<>"']/g, strataCharacter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[strataCharacter]);
}

function buildStrataOverlay(strataModel, strataOptions = {}) {
  const strataPalette = STRATA_PALETTES[strataOptions.theme] || STRATA_PALETTES.Ink;
  const strataCompact = strataOptions.compact === true;
  const strataFormat = strataValue => Number.isFinite(strataValue) ? strataValue.toFixed(Math.min(6, Math.max(2, strataOptions.decimals ?? 2))) : '—';
  const strataRows = [];
  const strataFull = strataModel.latest;
  const strataWidth = strataCompact ? 248 : 292;
  const strataTextCell = (strataText, strataStyle = {}) => ({ text: strataText, padding: '4px 13px', ...strataStyle });
  const strataSplitCell = (strataLeft, strataRight, strataColor) => ({ padding: '4px 13px 0', table: {
    width: '100%', color: strataColor, fontSize: '10px', borderCollapse: 'collapse',
    rows: [{ cells: [{ text: strataLeft, textAlign: 'left', padding: 0 }, { text: strataRight, textAlign: 'right', padding: 0 }] }]
  } });
  strataRows.push({ cells: [strataTextCell('S T R A T A', { fontSize: '25px', fontFamily: 'Georgia, serif', paddingTop: '12px', color: strataPalette.text })] });
  strataRows.push({ cells: [strataTextCell('PRICE MEMORY ATLAS', { fontSize: '9px', letterSpacing: '2px', color: strataPalette.muted, paddingTop: 0 })] });
  if (!strataFull) {
    strataRows.push({ cells: [strataTextCell(strataEscape(strataModel.status), { padding: '16px 13px', fontSize: '11px' })] });
  } else {
    strataRows.push({ cells: [strataTextCell(strataFull.state, { fontSize: '10px', color: strataPalette.recent, paddingTop: '9px', fontWeight: 'bold' })] });
    strataRows.push({ cells: [strataTextCell('Completed close <b>' + strataFormat(strataFull.reference) + '</b> · ' + strataEscape(strataOptions.symbol || '') + ' ' + strataEscape(strataOptions.resolution || ''), { fontSize: '11px', color: strataPalette.muted })] });
    for (let strataH = 0; strataH < 3; strataH += 1) {
      const strataProfile = strataFull.profiles[strataH];
      const strataColor = [strataPalette.recent, strataPalette.middle, strataPalette.base][strataH];
      const strataChart = {
        width: String(strataWidth - 26) + 'px', height: strataCompact ? '35px' : '46px', type: 'line',
        data: { datasets: [{ data: strataProfile.histogram, borderColor: strataColor, backgroundColor: strataColor + '45', borderWidth: 1.8, pointRadius: 0, fill: true, tension: 0 }] },
        options: { responsive: true, animation: false, maintainAspectRatio: false, layout: { padding: 0 },
          scales: { x: { type: 'linear', min: strataFull.minimum, max: strataFull.maximum, display: false },
            y: { min: 0, max: Math.max(...strataFull.profiles.flatMap(strataOther => strataOther.histogram.map(strataPoint => strataPoint.y))) * 1.05, display: false } },
          plugins: { legend: { display: false }, tooltip: { enabled: false },
            annotation: { annotations: { reference: { type: 'line', xMin: strataFull.reference, xMax: strataFull.reference, borderColor: strataPalette.text, borderWidth: 1, borderDash: [2, 3] },
              median: { type: 'line', xMin: strataProfile.median, xMax: strataProfile.median, borderColor: strataColor, borderWidth: 1 } } } }
        }
      };
      strataRows.push({ cells: [strataSplitCell('<b>' + strataProfile.horizon + ' BARS</b>', strataFormat(strataProfile.median) + ' median', strataColor)] });
      strataRows.push({ cells: [{ padding: '0 13px', chart: strataChart }] });
    }
    strataRows.push({ cells: [strataSplitCell(strataFormat(strataFull.minimum), strataFormat(strataFull.maximum), strataPalette.muted)] });
    strataRows.push({ cells: [strataTextCell('20↔120 median shift <b>' + (strataFull.migration >= 0 ? '+' : '') + (strataFull.migration * 100).toFixed(1) + '%</b> · IQR overlap <b>' + Math.round(strataFull.overlap * 100) + '%</b>', { borderTop: '1px solid ' + strataPalette.border, fontSize: '10px', paddingTop: '9px' })] });
    strataRows.push({ cells: [strataTextCell('Close rank in 120 bars <b>' + (strataFull.profiles[2].rank * 100).toFixed(1) + ' / 100</b>' + (strataFull.flat ? ' · FLAT SAMPLE' : ''), { fontSize: '10px', color: strataPalette.muted })] });
  }
  strataRows.push({ cells: [strataTextCell('60-bar terrain · low → high close percentiles', { color: strataPalette.muted, fontSize: '9px', paddingTop: '7px', paddingBottom: '3px' })] });
  strataRows.push({ cells: [{ padding: '0 13px 2px', table: { width: '100%', borderSpacing: 0, borderCollapse: 'collapse', rows: [{ cells: strataPalette.levels.map(strataColor => ({ text: ' ', height: '3px', width: '11.11%', backgroundColor: strataColor, padding: 0 })) }] } }] });
  strataRows.push({ cells: [strataTextCell('Equal-weight closes · shared price & density scales<br/>Solid: median · dotted: completed close<br/>Historical context, not a forecast', { color: strataPalette.muted, fontSize: '9px', lineHeight: '14px', paddingBottom: '11px', paddingTop: '7px' })] });
  return { width: strataWidth + 'px', backgroundColor: strataPalette.background, color: strataPalette.text, border: '1px solid ' + strataPalette.border,
    borderRadius: '10px', borderCollapse: 'separate', borderSpacing: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    fontFamily: 'Arial, sans-serif', rows: strataRows };
}


// src/trendspider.js
describe_indicator('Strata - Price Memory Atlas', 'price', { shortName: 'STRATA', warmup: 121, decimals: 'by_symbol', mainColorInheritFrom: 'Recent memory · 20 bars' });

const strataTheme = input('Palette', 'Ink', ['Ink', 'Paper']);
const strataShowContours = input('Price contours', 'Show', ['Show', 'Hide']) === 'Show';
const strataShowMedians = input('Memory paths', 'Show', ['Show', 'Hide']) === 'Show';
const strataCardSize = input('Atlas card', 'Full', ['Full', 'Compact']);
const strataModel = calculateStrata(close);
const strataInk = STRATA_PALETTES[strataTheme];
const strataMasked = (strataSeries, strataVisible) => strataVisible ? strataSeries : strataSeries.map(() => null);
const strataLevels = [];
// Fixed loop and fixed names: identical paint/fill/overlay topology for all inputs.
for (let strataQ = 0; strataQ < 9; strataQ += 1) {
  strataLevels.push(paint(strataMasked(strataModel.contours[strataQ], strataShowContours), {
    name: 'Memory contour · ' + Math.round(STRATA_QUANTILES[strataQ] * 100) + '%',
    color: close.map(() => strataInk.levels[strataQ] + (strataQ === 4 ? '' : 'b8')),
    thickness: strataQ === 4 ? 2 : 0.85, hideInLegend: true, ignoreWhenScaling: true, editorHidden: true
  }));
}
for (let strataBand = 0; strataBand < 8; strataBand += 1) {
  fill(strataLevels[strataBand], strataLevels[strataBand + 1], STRATA_LAYER_COLORS[strataBand],
    STRATA_LAYER_OPACITIES[strataBand], 'Strata chromatic band ' + strataBand);
}
paint(strataMasked(strataModel.medians[0], strataShowMedians), { name: 'Recent memory · 20 bars', color: close.map(() => strataInk.recent), thickness: 2.5, ignoreWhenScaling: true, editorHidden: true });
paint(strataMasked(strataModel.medians[2], strataShowMedians), { name: 'Base memory · 120 bars', color: close.map(() => strataInk.base), thickness: 2, ignoreWhenScaling: true, editorHidden: true });
paint_overlay('Strata atlas', { position: 'bottom_left', order: 'above_all', offset_x: 48, offset_y: -10 },
  buildStrataOverlay(strataModel, { theme: strataTheme, compact: strataCardSize === 'Compact', decimals: current.decimals, symbol: current.ticker, resolution: current.resolution }));
