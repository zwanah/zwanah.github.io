import {initMap, setBasemap, setView, bbox, renderResults, clearResults, filterResults, exportGeoJSON, fitResults} from './map.js';
import {verificationToken} from './verification.js';

const $ = id => document.getElementById(id);
const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? `${location.origin}/api/xover`
  : 'https://osm-api.wanzhuoyue.com/api/xover';

let config = null;
let samples = [];
let busy = false;
let activeSample = 'accessible-transit';
let kNotice = '';

const labels = {
  verified: '1 · Human verification complete',
  selection: '2 · C2: selecting cross-lingual examples',
  generation: '3 · Preparing three candidate queries',
  execution: '4 · Executing candidate queries',
  selection_candidates: '5 · C3: comparing execution results',
  revision: '6 · C4: checking hygiene and syntax',
};

const sourceLabel = {
  precomputed: 'research precomputation',
  persistent: 'saved cache',
  memory: 'memory cache',
  computed: 'new computation',
  generated: 'new generation',
};

function status(message, type = '') {
  $('status').textContent = message;
  $('status').className = type === true ? 'error' : type;
}

function stage(key, text) {
  let li = $('stages').querySelector(`[data-stage="${key}"]`);
  if (!li) {
    li = document.createElement('li');
    li.dataset.stage = key;
    $('stages').append(li);
  }
  li.textContent = text;
}

function element(tag, text, parent, className = '') {
  const e = document.createElement(tag);
  e.textContent = text;
  if (className) e.className = className;
  parent.append(e);
  return e;
}

function renderKShot() {
  const slider = $('k-shot');
  const k = Number(slider.value);
  const min = Number(slider.min || 0);
  const max = Number(slider.max || 12);
  const pct = max > min ? ((k - min) / (max - min)) * 100 : 0;
  slider.style.setProperty('--budget-pct', `${pct.toFixed(1)}%`);

  const out = $('k-shot-value');
  out.replaceChildren(document.createTextNode(k === 0 ? '0 ' : `${k} `));
  const unit = document.createElement('span');
  unit.textContent = k === 0 ? 'zero-shot' : k === 1 ? 'example' : 'examples';
  out.append(unit);

  document.querySelectorAll('[data-k-preset]').forEach(btn => {
    btn.classList.toggle('is-active', Number(btn.dataset.kPreset) === k);
  });

  $('k-shot-note').textContent = kNotice || (k
    ? `Use ${k} English ${k === 1 ? 'example' : 'examples'} for the next question · 3 candidate queries.`
    : 'Zero-shot: no example demonstrations · 3 candidate queries.');
}

function syncLangPills() {
  const current = $('language').value;
  document.querySelectorAll('[data-lang]').forEach(btn => {
    const isActive = btn.dataset.lang === current;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function setBusy(value) {
  busy = value;
  for (const id of ['ask', 'question', 'language', 'k-shot']) $(id).disabled = value;
  document.querySelectorAll('[data-sample],[data-lang],[data-k-preset]').forEach(b => { b.disabled = value; });
  $('ask-label').textContent = value ? 'Working through XOver…' : config ? 'Ask XOver' : 'Service unavailable';
  $('results').setAttribute('aria-busy', String(value));
}

function clearFilterInput() {
  const filter = $('place-filter');
  const count = $('filter-count');
  if (filter) filter.value = '';
  if (count) count.hidden = true;
}

function cityShort(place = '') {
  return place.split(',')[0].trim() || place;
}

function tagBadgeText(icon = '') {
  if (icon === 'transit') return 'transit';
  if (icon === 'library') return 'exclude';
  return 'city';
}

function renderSamples() {
  $('samples').replaceChildren();
  for (const s of samples.filter(item => item.language === $('language').value)) {
    const isActive = s.id === activeSample;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sample' + (isActive ? ' active' : '');
    button.dataset.sample = s.id;
    button.disabled = busy;
    button.setAttribute('aria-pressed', String(isActive));

    const top = element('span', '', button, 'sample-top');
    element('span', cityShort(s.place), top, 'sample-city');
    element('span', tagBadgeText(s.icon), top, 'sample-tag');

    const copy = element('span', '', button, 'sample-copy');
    element('span', s.label, copy, 'sample-title');
    const detailParts = s.detail.split('·');
    element('small', (detailParts[1] || s.detail).trim(), copy);

    button.title = s.question;
    button.addEventListener('click', () => {
      if (busy) return;
      activeSample = s.id;
      applySample();
    });
    $('samples').append(button);
  }
}

function resetPendingPlaceholder() {
  clearFilterInput();
  clearResults();
  const list = $('result-list');
  element('p', 'Run Ask XOver to compare three candidate queries and display verified OpenStreetMap places here.', list, 'list-empty');
  $('download').disabled = true;
  $('result-count').textContent = 'Ready to explore';
  $('result-note').textContent = 'C2–C4 pipeline';
  $('timing').textContent = 'Choose a language and showcase above, then click Ask XOver to execute.';
  $('map-badge-text').textContent = 'OpenStreetMap';
  $('result-info').textContent = 'Run the query against project OSM data';
}

function applySample() {
  const s = samples.find(item => item.language === $('language').value && item.id === activeSample)
    || samples.find(item => item.language === $('language').value);
  if (!s) return;
  activeSample = s.id;
  syncLangPills();
  renderSamples();
  $('question').value = s.question;
  $('question').lang = s.language;
  setView(s.center, s.zoom);
  resetPendingPlaceholder();
  $('place-title').firstChild.textContent = s.place + ' ';
  $('place-type').textContent = s.category;
  $('legend-label').textContent = s.category;
  $('stages').replaceChildren();
  if (config) status('Ready. Click Ask XOver to run multilingual retrieval and candidate voting.');
}

function show(result, elapsed) {
  clearFilterInput();
  $('query').textContent = result.query;
  $('turbo').href = 'https://overpass-turbo.eu/?Q=' + encodeURIComponent(result.query);
  $('query-source').lastChild.textContent = ` ${result.answer_cache ? 'Cached complete answer' : 'Selected winner'} · ${result.generation?.model || 'XOver'}`;

  const count = renderResults(result.result);
  $('result-count').textContent = `${count.count.toLocaleString()} ${count.isCount ? 'matching elements' : 'mapped places'}`;
  $('result-note').textContent = result.answer_cache ? 'Cached XOver answer' : (result.cache?.hit ? 'Cached OSM snapshot' : 'Project OSM snapshot');
  $('map-badge-text').textContent = 'Project OSM · verified';
  $('result-info').textContent = 'Project OSM snapshot · ' + (result.cache?.hit ? 'saved map result' : 'executed query');
  $('download').disabled = count.features === 0;
  $('timing').textContent = `${(elapsed / 1000).toFixed(2)} s total · ${((result.timings?.server_ms || 0) / 1000).toFixed(2)} s server · ${count.features ? 'select a card or pin to inspect' : 'execution complete'}`;

  const kUsed = result.selection?.examples?.length || 0;
  $('used-k').textContent = String(kUsed);
  $('examples-title').textContent = `${kUsed} selected English ${kUsed === 1 ? 'example' : 'examples'}`;
  $('provenance').textContent = `K-shot used: ${kUsed}. `
    + (result.answer_cache ? 'Complete query reused from cache. ' : '')
    + `Examples: ${sourceLabel[result.selection.cache_source] || result.selection.cache_source}. `
    + `Candidates: ${sourceLabel[result.generation.source] || result.generation.source} · ${result.generation.model}. `
    + (result.model_usage?.length ? `${result.model_usage.length} new model calls.` : 'No new model calls.')
    + ` Selection: ${result.candidate_selection.method}. `
    + (result.revision.syntax_repaired ? 'One syntax repair applied.' : 'No syntax repair needed.')
    + (result.revision.hygiene_changed ? ' Output formatting cleaned.' : '');

  const exContainer = $('examples');
  exContainer.replaceChildren();
  const stat = element('div', `C2 Profile-DPP · ${kUsed} English demonstrations · C3 ${result.candidate_selection.method}`, exContainer, 'context-stat');
  if (Number.isFinite(result.candidate_selection?.agreement)) {
    stat.textContent += ` (${Math.round(result.candidate_selection.agreement * 100)}% top-1 agreement)`;
  }

  for (const ex of result.selection.examples) {
    const details = document.createElement('details');
    details.className = 'context-example';
    element('summary', `${ex.rank}. ${ex.nl}`, details);
    if (Number.isFinite(ex.similarity) || Number.isFinite(ex.score)) {
      const val = Number.isFinite(ex.similarity) ? ex.similarity : ex.score;
      element('small', `Cross-lingual similarity ${val.toFixed(4)}`, details);
    }
    element('pre', ex.ovq, details);
    exContainer.append(details);
  }
  if (!kUsed) {
    element('p', 'Zero-shot mode: no demonstration examples were included in the prompt.', exContainer, 'muted');
  }

  const candWrap = $('candidates');
  candWrap.replaceChildren();
  for (const c of result.candidates) {
    const card = element('article', '', candWrap, 'candidate-card' + (c.selected ? ' selected' : ''));
    const head = element('div', '', card, 'candidate-head');
    element('h4', `Candidate ${c.index}`, head);
    element('span', c.selected ? '✓ Selected winner' : (c.ok ? 'Executed' : 'Failed'), head, 'candidate-badge');
    element('p', c.ok ? `${c.count.toLocaleString()} returned elements${c.cache?.hit ? ' · map cache hit' : ''}` : 'Could not execute on Overpass', card, 'candidate-meta');
    element('pre', c.query, card);
  }

  stage('complete', result.answer_cache ? 'Completed · saved query reused' : 'Completed · results ready');
  status(`XOver completed · ${count.count.toLocaleString()} ${count.isCount ? 'elements' : 'places'} in ${(elapsed / 1000).toFixed(2)}s.`, 'success');
}

async function run() {
  if (busy || !config) return;
  const question = $('question').value.trim();
  if (!question) { status('Enter a question first.', true); return; }

  const payload = {
    question,
    language: $('language').value,
    k_shot: Number($('k-shot').value),
    bbox: bbox(),
  };
  const start = performance.now();
  setBusy(true);
  $('stages').replaceChildren();
  clearFilterInput();
  clearResults();
  $('download').disabled = true;

  let reader;
  const controller = new AbortController();
  let timer;
  try {
    stage('verification', '1 · Waiting for browser verification');
    const token = await verificationToken(config.turnstile?.enabled ? config.turnstile : null, message => status(message));
    timer = setTimeout(() => controller.abort(), 250000);
    const headers = {'Content-Type': 'application/json'};
    if (token) headers['X-Turnstile-Token'] = token;
    const response = await fetch(API + '/query', {method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal});
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data.detail === 'string' ? data.detail : `Service returned HTTP ${response.status}.`);
    }
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', completed = false;
    function handle(line) {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.stage === 'error') throw new Error(event.detail || 'Query failed.');
      if (labels[event.stage]) {
        if (event.stage === 'verified') $('stages').querySelector('[data-stage="verification"]')?.remove();
        stage(event.stage, labels[event.stage]);
        status(event.message || labels[event.stage]);
      }
      if (event.stage === 'selection_done') stage('selection', `2 · C2 examples: ${sourceLabel[event.source] || event.source} · ${(event.elapsed_ms / 1000).toFixed(2)} s`);
      if (event.stage === 'candidate_generated') stage('generation', `3 · Generated candidate ${event.index} / ${event.total}`);
      if (event.stage === 'generation_done') stage('generation', `3 · Candidates: ${sourceLabel[event.source] || event.source} · ${(event.elapsed_ms / 1000).toFixed(2)} s`);
      if (event.stage === 'candidate_executed') stage('execution', `4 · Executed ${event.index} / 3 candidates${event.cache_hit ? ' · map cache hit' : ''}`);
      if (event.stage === 'complete') {
        completed = true;
        show(event.data, performance.now() - start);
      }
    }
    while (true) {
      const {value, done} = await reader.read();
      buffer += decoder.decode(value, {stream: !done});
      let n;
      while ((n = buffer.indexOf('\n')) >= 0) {
        handle(buffer.slice(0, n));
        buffer = buffer.slice(n + 1);
      }
      if (done) break;
    }
    if (buffer.trim()) handle(buffer);
    if (!completed) throw new Error('The connection ended before the query completed. Please retry.');
  } catch (error) {
    const message = error.name === 'AbortError' ? 'The query timed out. Please retry.' : error.message;
    stage('stopped', 'Stopped · ' + message);
    status(message, true);
  } finally {
    clearTimeout(timer);
    try { await reader?.cancel(); } catch {}
    setBusy(false);
  }
}

$('ask').addEventListener('click', run);
$('language').addEventListener('change', applySample);
$('lang-pills').addEventListener('click', event => {
  const pill = event.target.closest('[data-lang]');
  if (!pill || busy) return;
  $('language').value = pill.dataset.lang;
  applySample();
});

$('question').addEventListener('input', () => {
  document.querySelectorAll('[data-sample]').forEach(b => b.classList.remove('active'));
});
$('question').addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
});

$('k-shot').addEventListener('input', () => { kNotice = ''; renderKShot(); });
$('k-shot-info').addEventListener('click', () => {
  kNotice = 'C2 embeds your question with the multilingual ml_8x checkpoint and selects K diverse English demonstrations via Profile-DPP (0 = zero-shot).';
  renderKShot();
});
document.querySelectorAll('[data-k-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (busy) return;
    $('k-shot').value = btn.dataset.kPreset;
    kNotice = '';
    renderKShot();
  });
});

$('place-filter')?.addEventListener('input', event => {
  const res = filterResults(event.target.value);
  const badge = $('filter-count');
  if (!badge) return;
  badge.hidden = !res.filtered;
  if (res.filtered) badge.textContent = `${res.shown}/${res.total}`;
});

document.querySelectorAll('[data-jump-panel]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = $(`${btn.dataset.jumpPanel}-details`);
    if (!target) return;
    target.open = !target.open;
    if (target.open) target.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  });
});

document.querySelectorAll('[data-basemap]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-basemap]').forEach(b => b.classList.toggle('active', b === btn));
    setBasemap(btn.dataset.basemap);
  });
});

$('copy-query').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('query').textContent);
    const btn = $('copy-query');
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    status('Query copied.', 'success');
  } catch {
    status('Select and copy the query from the inspector.');
  }
});

$('download').addEventListener('click', exportGeoJSON);
$('fit-map').addEventListener('click', fitResults);
$('about-link').addEventListener('click', e => { e.preventDefault(); $('about-dialog').showModal(); });
$('close-about').addEventListener('click', () => $('about-dialog').close());
$('about-dialog').addEventListener('click', e => {
  if (e.target === $('about-dialog')) {
    const rect = e.target.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) e.target.close();
  }
});

renderKShot();

async function boot() {
  try {
    initMap();
    setView([40.71427, -74.00597], 12);
    samples = await (await fetch(new URL('../showcases.json', import.meta.url))).json();
    applySample();

    const response = await fetch(API + '/config', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Could not connect to XOver.');
    config = await response.json();
    if (!config.generation_available) throw new Error('XOver generation is currently unavailable.');

    $('mode-dot').classList.add('live');
    $('mode-label').textContent = 'Live pipeline';
    if (config.model) $('model-label').textContent = `8 languages · ${config.model}`;

    const protection = config.protection;
    if (protection?.enabled && Number.isInteger(protection.generate_per_minute) && Number.isInteger(protection.model_per_ip_day)) {
      $('usage-limits').textContent = `Public demo · ${protection.generate_per_minute} questions/min · ${protection.model_per_ip_day} new model calls/day per IP.`;
      $('usage-limits').hidden = false;
    }

    $('ask').disabled = false;
    $('ask-label').textContent = 'Ask XOver';
    status('Ready. Choose any of the 8 languages or write your own question.');
  } catch (error) {
    status(error.message, true);
    $('ask').disabled = true;
    $('ask-label').textContent = 'Service unavailable';
  }
}

boot();
