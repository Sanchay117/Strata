import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { calculateStrata, strataQuantile, strataRank, strataHistogram } from '../src/engine.js';
import { buildStrataOverlay } from '../src/presentation.js';

test('interpolated quantiles match hand calculations', () => {
  assert.equal(strataQuantile([1, 2, 4, 8], 0.25), 1.75);
  assert.equal(strataQuantile([1, 2, 4, 8], 0.5), 3);
  assert.equal(strataQuantile([1, 2, 4, 8], 0.75), 5);
  assert.equal(strataRank([1, 2, 2, 4], 2), 0.5);
});
test('histogram conserves sample mass including the right boundary', () => {
  const histogram = strataHistogram([1, 2, 3, 4], 1, 4, 3);
  assert.deepEqual(histogram.map(point => point.y), [0.25, 0.25, 0.5]);
  assert.equal(histogram.reduce((total, point) => total + point.y, 0), 1);
});
const sample = Array.from({ length: 340 }, (_, index) => 100 + index * 0.1 + 7 * Math.sin(index / 12));
test('every historical prefix and current-bar mutation preserve the visual history', () => {
  const full = calculateStrata(sample);
  for (const length of [121, 145, 200, 339]) {
    const prefix = sample.slice(0, length);
    const actual = calculateStrata(prefix);
    for (let level = 0; level < 9; level += 1) assert.deepEqual(actual.contours[level], full.contours[level].slice(0, length));
    prefix[length - 1] = 100000;
    assert.deepEqual(calculateStrata(prefix), actual);
  }
});
test('rising sequence has exact completed-bar windows, overlap and medians', () => {
  const result = calculateStrata(Array.from({ length: 122 }, (_, index) => index + 1));
  assert.equal(result.latest.completedIndex, 120);
  assert.deepEqual(result.latest.profiles.map(profile => profile.median), [111.5, 91.5, 61.5]);
  assert.equal(result.latest.reference, 121);
  assert.equal(result.latest.state, 'RECENT ABOVE BASE');
  assert.equal(result.latest.overlap, 0);
  assert.equal(result.latest.profiles[2].rank, 119.5 / 120);
});
test('flat prices stay finite and report a flat sample without invented dispersion', () => {
  const result = calculateStrata(Array(140).fill(50));
  assert.equal(result.latest.flat, true);
  assert.equal(result.latest.overlap, 1);
  assert.equal(result.latest.migration, 0);
  assert.equal(result.latest.profiles[2].rank, 0.5);
  assert(result.latest.profiles.every(profile => profile.median === 50));
  assert(!JSON.stringify(result).includes('NaN'));
});
test('insufficient and invalid histories produce clear status and gaps', () => {
  assert.equal(calculateStrata(Array(120).fill(50)).latest, null);
  const prices = sample.slice(); prices[330] = null;
  const result = calculateStrata(prices);
  assert.equal(result.latest, null);
  assert.equal(result.contours[4].at(-1), null);
  assert.match(result.status, /Missing/);
});
test('price scaling preserves state, rank and overlap', () => {
  const first = calculateStrata(sample).latest;
  const second = calculateStrata(sample.map(value => value * 8)).latest;
  assert.equal(first.state, second.state);
  assert.equal(first.overlap, second.overlap);
  assert.equal(first.profiles[2].rank, second.profiles[2].rank);
  assert.equal(first.profiles[0].median * 8, second.profiles[0].median);
});
test('native adapter has stable named plots and serializable charts across appearances', async () => {
  const script = await readFile(new URL('../dist/strata.trendspider.js', import.meta.url), 'utf8');
  let names;
  for (const palette of ['Ink', 'Paper']) for (const toggle of ['Show', 'Hide']) for (const size of ['Full', 'Compact']) {
    const plots = []; const fills = []; const overlays = [];
    vm.runInNewContext(script, { close: sample, current: { ticker: 'TEST', decimals: 2, resolution: 'D' },
      describe_indicator() {}, input(title, value) { return title === 'Palette' ? palette : title === 'Atlas card' ? size : ['Price contours', 'Memory paths'].includes(title) ? toggle : value; },
      paint(series, options) { assert.equal(series.length, sample.length); assert.equal(options.color.length, sample.length); assert.equal(options.color[0], options.color.at(-1)); plots.push(options.name); return options.name; },
      fill(...args) { fills.push(args); }, paint_overlay(...args) { overlays.push(args); } });
    assert.equal(plots.length, 11); assert.equal(fills.length, 8); assert.equal(overlays.length, 1);
    assert.equal(new Set(plots).size, 11);
    if (names) assert.deepEqual(plots, names); else names = plots;
    const definition = overlays[0][2];
    assert.doesNotThrow(() => JSON.stringify(definition));
    assert.equal(definition.rows.filter(row => row.cells.some(cell => cell.chart)).length, 3);
    assert(!/register_signal\(/.test(script));
  }
});
test('overlay escapes symbols and explains the historical nature of the display', () => {
  const overlay = JSON.stringify(buildStrataOverlay(calculateStrata(sample), { symbol: '<img src=x>' }));
  assert(overlay.includes('&lt;img src=x&gt;'));
  assert(overlay.includes('not a forecast'));
});
