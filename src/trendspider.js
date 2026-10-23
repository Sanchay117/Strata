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
    color: close.map(() => strataQ === 4 ? strataInk.middle : strataInk.contour),
    thickness: strataQ === 4 ? 1.7 : 0.65, hideInLegend: true, ignoreWhenScaling: true, editorHidden: true
  }));
}
for (let strataBand = 0; strataBand < 8; strataBand += 1) {
  fill(strataLevels[strataBand], strataLevels[strataBand + 1], '#4d9ea5',
    [0.035, 0.07, 0.12, 0.19, 0.19, 0.12, 0.07, 0.035][strataBand], 'Price memory layer ' + strataBand);
}
paint(strataMasked(strataModel.medians[0], strataShowMedians), { name: 'Recent memory · 20 bars', color: close.map(() => strataInk.recent), thickness: 2, ignoreWhenScaling: true, editorHidden: true });
paint(strataMasked(strataModel.medians[2], strataShowMedians), { name: 'Base memory · 120 bars', color: close.map(() => strataInk.base), thickness: 1.7, ignoreWhenScaling: true, editorHidden: true });
paint_overlay('Strata atlas', { position: 'bottom_left', order: 'above_all', offset_x: 48, offset_y: -10 },
  buildStrataOverlay(strataModel, { theme: strataTheme, compact: strataCardSize === 'Compact', decimals: current.decimals, symbol: current.ticker, resolution: current.resolution }));
