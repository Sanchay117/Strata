import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { calculateStrata } from '../src/engine.js';
import { buildStrataOverlay } from '../src/presentation.js';
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('preview/data/manifest.json', root)));
const records = [];
for (const entry of manifest.entries) {
  const raw = await readFile(new URL('preview/data/' + entry.symbol + '.json', root));
  assert.equal(createHash('sha256').update(raw).digest('hex'), entry.sha256);
  const { bars } = JSON.parse(raw);
  const model = calculateStrata(bars.map(bar => bar.close));
  assert(model.latest);
  for (let index = 120; index < bars.length; index++) {
    const levels = model.contours.map(series => series[index]);
    assert(levels.every(Number.isFinite));
    assert(levels.every((value, i) => i === 0 || value >= levels[i - 1]));
  }
  for (const profile of model.latest.profiles) assert(Math.abs(profile.histogram.reduce((sum, point) => sum + point.y, 0) - 1) < 1e-12);
  for (const theme of ['Ink', 'Paper']) {
    const charts = buildStrataOverlay(model, { theme }).rows.flatMap(row => row.cells.filter(cell => cell.chart).map(cell => cell.chart));
    assert.equal(charts.length, 3);
    for (const chart of charts) assert.deepEqual(chart.options.scales, charts[0].options.scales);
    assert(charts.every(chart => chart.options.responsive && !chart.options.maintainAspectRatio));
  }
  records.push({ symbol: entry.symbol, bars: bars.length, lastVisibleDate: bars.at(-1).date,
    completedReferenceDate: bars.at(-2).date, state: model.latest.state,
    migration: model.latest.migration, overlap: model.latest.overlap, closeRank: model.latest.profiles[2].rank });
}
const prices = Array.from({ length: 7000 }, (_, index) => 100 * Math.exp(index / 20000 + 0.15 * Math.sin(index / 47)));
const started = performance.now();
assert(calculateStrata(prices).latest);
const elapsed = performance.now() - started;
const output = { fixtureCutoff: manifest.cutoff, symbols: records, checks: ['fixture SHA-256', 'ordered finite contours', 'histogram mass conservation', 'identical axes for all profiles', 'native responsive chart sizing'],
  synthetic7000BarCalculationMs: Math.round(elapsed * 100) / 100,
  note: 'Functional and rendering QA only; runtime is environment-dependent. Not a trading backtest.' };
await mkdir(new URL('review/', root), { recursive: true });
await writeFile(new URL('review/validation.json', root), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
