/* Strata: observed closing-price distributions, equally weighted by bar.
 * Output at index i uses ONLY prices at indices < i. No current candle,
 * volume-at-price approximation, holder-cost claim, prediction, or trade signal.
 * Linear sample quantiles: index = probability * (sample size - 1).
 */
export const STRATA_HORIZONS = Object.freeze([20, 60, 120]);
export const STRATA_QUANTILES = Object.freeze([0.05, 0.15, 0.25, 0.35, 0.5, 0.65, 0.75, 0.85, 0.95]);

export function strataQuantile(strataSorted, strataProbability) {
  if (!strataSorted.length || strataProbability < 0 || strataProbability > 1) return null;
  const strataIndex = (strataSorted.length - 1) * strataProbability;
  const strataFloor = Math.floor(strataIndex);
  return strataSorted[strataFloor] + (strataSorted[Math.ceil(strataIndex)] - strataSorted[strataFloor]) * (strataIndex - strataFloor);
}

export function strataRank(strataSorted, strataPrice) {
  let strataBelow = 0;
  let strataEqual = 0;
  for (const strataValue of strataSorted) {
    if (strataValue < strataPrice) strataBelow += 1;
    else if (strataValue === strataPrice) strataEqual += 1;
  }
  return strataSorted.length ? (strataBelow + 0.5 * strataEqual) / strataSorted.length : null;
}

export function strataHistogram(strataValues, strataMinimum, strataMaximum, strataBins = 32) {
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

export function calculateStrata(strataPrices) {
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
