import { calculateStrata } from '../src/engine.js';
import { STRATA_PALETTES, STRATA_LAYER_COLORS, STRATA_LAYER_OPACITIES, buildStrataOverlay, strataEscape } from '../src/presentation.js';
const byId = id => document.getElementById(id);
let payload;
let sourceCode = '';
const fmt = value => value.toFixed(2);
function densitySvg(config) {
  const width = parseInt(config.width), height = parseInt(config.height);
  const points = config.data.datasets[0].data;
  const dataset = config.data.datasets[0];
  const scale = config.options.scales;
  const x = value => (value - scale.x.min) / (scale.x.max - scale.x.min) * width;
  const y = value => height - 2 - value / scale.y.max * (height - 5);
  const poly = points.map(point => x(point.x) + ',' + y(point.y)).join(' ');
  const annotations = Object.values(config.options.plugins.annotation.annotations).map(item => `<line x1="${x(item.xMin)}" x2="${x(item.xMin)}" y1="0" y2="${height}" stroke="${item.borderColor}" stroke-width="1" ${item.borderDash ? 'stroke-dasharray="2 3"' : ''}/>`).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="Historical closing-price distribution"><polygon points="${x(points[0].x)},${height} ${poly} ${x(points.at(-1).x)},${height}" fill="${dataset.backgroundColor}"/><polyline points="${poly}" fill="none" stroke="${dataset.borderColor}" stroke-width="1.5"/>${annotations}</svg>`;
}
function tableElement(definition) {
  const table = document.createElement('table');
  for (const [key, value] of Object.entries(definition)) if (key !== 'rows') table.style[key] = value;
  for (const rowDefinition of definition.rows) {
    const row = table.insertRow();
    for (const definition of rowDefinition.cells) {
      const cell = row.insertCell();
      for (const [key, value] of Object.entries(definition)) if (!['text', 'chart', 'table'].includes(key)) cell.style[key] = value;
      if (definition.text !== undefined) cell.innerHTML = definition.text;
      if (definition.chart) cell.innerHTML = densitySvg(definition.chart);
      if (definition.table) cell.append(tableElement(definition.table));
    }
  }
  return table;
}
function render() {
  if (!payload) return;
  const size = Number(byId('replay').value);
  const bars = payload.bars.slice(0, size);
  const model = calculateStrata(bars.map(bar => bar.close));
  const theme = byId('theme').value;
  const ink = STRATA_PALETTES[theme];
  document.documentElement.dataset.theme = theme;
  const first = Math.max(0, bars.length - 210);
  const shown = bars.slice(first);
  const lower = Math.min(...shown.map(bar => bar.low));
  const upper = Math.max(...shown.map(bar => bar.high));
  const pad = Math.max((upper - lower) * 0.08, upper * 0.005);
  const x = index => 23 + (index - first) / Math.max(1, shown.length - 1) * 887;
  const y = price => 435 - (price - lower + pad) / (upper - lower + 2 * pad) * 415;
  const path = line => line.slice(first).map((value, index) => value === null ? null : [x(index + first), y(value)]).filter(Boolean);
  const poly = points => points.map(point => point.join(',')).join(' ');
  const content = [];
  for (let tick = 0; tick <= 5; tick++) {
    const price = lower + (upper - lower) * tick / 5;
    content.push(`<line x1="20" y1="${y(price)}" x2="920" y2="${y(price)}" stroke="var(--grid)" stroke-width="1"/><text x="935" y="${y(price) + 4}" fill="${ink.muted}" font-size="11">${fmt(price)}</text>`);
  }
  if (byId('contours').value === 'Show') {
    for (let level = 0; level < 8; level++) {
      content.push(`<polygon points="${poly([...path(model.contours[level]), ...path(model.contours[level + 1]).reverse()])}" fill="${STRATA_LAYER_COLORS[level]}" fill-opacity="${STRATA_LAYER_OPACITIES[level]}"/>`);
    }
    for (let level = 0; level < 9; level++) content.push(`<polyline points="${poly(path(model.contours[level]))}" fill="none" stroke="${ink.levels[level]}" stroke-opacity="${level === 4 ? 1 : .72}" stroke-width="${level === 4 ? 2 : .85}"/>`);
  }
  for (const [index, bar] of shown.entries()) {
    const cx = x(first + index), color = bar.close >= bar.open ? ink.recent : '#c77e80';
    content.push(`<line x1="${cx}" x2="${cx}" y1="${y(bar.high)}" y2="${y(bar.low)}" stroke="${color}" stroke-width=".8"/><rect x="${cx - 1.25}" y="${Math.min(y(bar.open),y(bar.close))}" width="2.5" height="${Math.max(.8,Math.abs(y(bar.open)-y(bar.close)))}" fill="${color}"/>`);
  }
  for (const [index, color] of [[0, ink.recent], [2, ink.base]]) content.push(`<polyline points="${poly(path(model.medians[index]))}" fill="none" stroke="${color}" stroke-width="${index === 0 ? 2.5 : 2}"/>`);
  document.documentElement.style.setProperty('--teal', ink.recent);
  document.documentElement.style.setProperty('--gold', ink.base);
  for (let tick = 0; tick < 5; tick++) {
    const index = first + Math.round((shown.length - 1) * tick / 4);
    content.push(`<text x="${x(index)}" y="470" fill="${ink.muted}" font-size="10" text-anchor="${tick === 0 ? 'start' : tick === 4 ? 'end' : 'middle'}">${bars[index].date}</text>`);
  }
  byId('chart').innerHTML = content.join('');
  byId('chartTitle').textContent = payload.symbol + ' / PRICE MEMORY';
  byId('asOf').textContent = 'DAILY · ' + bars.at(-1).date;
  byId('replayDate').textContent = bars.at(-1).date;
  const narrow = window.innerWidth < 950;
  byId('atlas').replaceChildren(tableElement(buildStrataOverlay(model, { theme, compact: narrow, symbol: payload.symbol, resolution: 'D' })));
  byId('reading').innerHTML = `<b>${strataEscape(model.latest.state)}.</b> The recent median is ${Math.abs(model.latest.migration * 100).toFixed(1)}% ${model.latest.migration >= 0 ? 'above' : 'below'} the 120-bar median. Their middle-half price ranges overlap by ${(model.latest.overlap * 100).toFixed(0)}%. This describes price history; it does not predict the next move.`;
}
async function loadSymbol() {
  const response = await fetch('data/' + byId('symbol').value + '.json');
  if (!response.ok) throw Error('Could not load the review fixture');
  payload = await response.json();
  byId('replay').max = payload.bars.length;
  byId('replay').value = payload.bars.length;
  render();
}
byId('symbol').addEventListener('change', () => loadSymbol().catch(error => { byId('reading').textContent = error.message; }));
for (const id of ['theme', 'contours', 'replay']) byId(id).addEventListener('input', render);
window.addEventListener('resize', render);
byId('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(sourceCode); byId('copyStatus').textContent = 'Copied'; }
  catch { byId('copyStatus').textContent = 'Select and copy the source below'; }
});
sourceCode = await fetch('../dist/strata.trendspider.js').then(response => response.text());
byId('source').textContent = sourceCode;
await loadSymbol();
