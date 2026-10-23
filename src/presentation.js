export const STRATA_PALETTES = Object.freeze({
  Ink: { background: '#0d1b25', text: '#eef4f3', muted: '#9bb0ba', border: '#29404c', contour: '#4d9ea5', recent: '#62e3ce', middle: '#cfb5ff', base: '#ffd08b', plot: '#0a141c',
    levels: ['#ae87f4', '#8e9bff', '#65b9f8', '#56d8dc', '#cfb5ff', '#9be3b6', '#f0d28b', '#f3ac7d', '#ef8fa0'] },
  Paper: { background: '#f4f1e8', text: '#1c343d', muted: '#536e75', border: '#c8d3cf', contour: '#187f88', recent: '#006e66', middle: '#713da5', base: '#945714', plot: '#faf8f1',
    levels: ['#7541b9', '#5256b7', '#276ea6', '#087d88', '#713da5', '#277a51', '#936518', '#ab5b29', '#ac3e63'] }
});
// Constant fill colors have stable native styles; per-theme line colors are dynamic.
export const STRATA_LAYER_COLORS = Object.freeze(['#9470e8', '#6f8eea', '#42add8', '#42c6c1', '#8dce9c', '#d8bf6f', '#e0a16c', '#df8497']);
export const STRATA_LAYER_OPACITIES = Object.freeze([0.09, 0.13, 0.17, 0.23, 0.23, 0.17, 0.13, 0.09]);

export function strataEscape(strataText) {
  return String(strataText).replace(/[&<>"']/g, strataCharacter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[strataCharacter]);
}

export function buildStrataOverlay(strataModel, strataOptions = {}) {
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
