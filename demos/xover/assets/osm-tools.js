/**
 * OpenStreetMap & OverpassQL inspection utilities (shared by TACO & XOver).
 * Pure DOM/text operations: zero external dependencies, 100% XSS-safe.
 */

const ELEMENT_RE = /\b(nwr|node|way|relation|rel)\b/g;
const SUBTRACT_RE = /\(\s*\.([a-zA-Z0-9_]+)\s*;\s*-\s*\.([a-zA-Z0-9_]+)\s*;?\s*\)/g;
const AROUND_RE = /\(\s*around(?:\.([a-zA-Z0-9_]+))?\s*:\s*([0-9.]+)/g;
const AREA_FILTER_RE = /area\s*\[\s*["']?(?:name|name:[a-z-]+)["']?\s*[=~]\s*["']([^"']+)["']/i;
const GEOCODE_AREA_RE = /\{\{\s*geocodeArea\s*:\s*["']?([^}"']+)["']?\s*\}\}/i;
const OUT_RE = /\bout\b([^;]*);/gi;

function stripComments(ovq) {
  return String(ovq || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
}

function unescapeTagString(raw) {
  return raw.replace(/\\(["'\\])/g, '$1');
}

function parseBracketPredicates(statement) {
  const results = [];
  const bracketRe = /\[([^\[\]]+)\]/g;
  let m;
  while ((m = bracketRe.exec(statement)) !== null) {
    const inner = m[1].trim();
    if (/^(out|timeout|maxsize|bbox|date|diff|adiff)\s*:/i.test(inner)) continue;
    if (/^if\s*:/i.test(inner)) {
      results.push({raw: inner, op: 'if', key: 'if', val: inner.slice(3).trim()});
      continue;
    }
    const kv = inner.match(/^["']?([^"'=!~]+?)["']?\s*(!=|!~|=|~)\s*["']((?:\\.|[^"'])*)["'](?:\s*,\s*i)?$/);
    if (kv) {
      const [, key, op, rawVal] = kv;
      results.push({
        key: key.trim(),
        op,
        val: unescapeTagString(rawVal),
        caseInsensitive: /,\s*i\s*$/.test(inner),
      });
      continue;
    }
    const exists = inner.match(/^(!)?\s*["']([^"']+)["']$/);
    if (exists) {
      results.push({
        key: exists[2].trim(),
        op: exists[1] ? '!exists' : 'exists',
        val: '*',
      });
    }
  }
  return results;
}

export function parseOverpassQuery(rawQuery) {
  const clean = stripComments(rawQuery);
  if (!clean.trim()) return {anatomy: [], positiveFilters: [], excludedFilters: []};

  const subtractedSets = new Set();
  const anatomy = [];
  let subMatch;
  SUBTRACT_RE.lastIndex = 0;
  while ((subMatch = SUBTRACT_RE.exec(clean)) !== null) {
    subtractedSets.add(subMatch[2]);
  }

  // 1. Target OSM element types
  const elemTypes = new Set();
  let em;
  ELEMENT_RE.lastIndex = 0;
  while ((em = ELEMENT_RE.exec(clean)) !== null) {
    const tok = em[1] === 'rel' ? 'relation' : em[1];
    elemTypes.add(tok);
  }
  if (elemTypes.size) {
    const label = elemTypes.has('nwr')
      ? 'nwr (node+way+rel)'
      : Array.from(elemTypes).join(' + ');
    anatomy.push({kind: 'Elements', label, tone: 'neutral'});
  }

  // 2. Spatial scope (named area, {{bbox}}, proximity around, or fixed bbox)
  const geocodeMatch = clean.match(GEOCODE_AREA_RE);
  const areaNameMatch = clean.match(AREA_FILTER_RE);
  if (geocodeMatch) {
    anatomy.push({kind: 'Area', label: geocodeMatch[1].trim(), tone: 'accent'});
  } else if (areaNameMatch) {
    anatomy.push({kind: 'Area', label: areaNameMatch[1].trim(), tone: 'accent'});
  }
  if (/\{\{\s*bbox\s*\}\}/i.test(clean)) {
    anatomy.push({kind: 'Scope', label: 'Current map {{bbox}}', tone: 'accent'});
  } else if (/\(\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*\)/.test(clean)) {
    anatomy.push({kind: 'Scope', label: 'Fixed coordinate bbox', tone: 'neutral'});
  }

  let aroundMatch;
  AROUND_RE.lastIndex = 0;
  while ((aroundMatch = AROUND_RE.exec(clean)) !== null) {
    const setRef = aroundMatch[1] ? `.${aroundMatch[1]}` : 'anchor';
    anatomy.push({kind: 'Spatial', label: `≤${aroundMatch[2]}m around ${setRef}`, tone: 'amber'});
  }

  // 3. Parse statements for positive vs excluded tag filters
  const positiveFilters = [];
  const excludedFilters = [];
  const seenFilterKeys = new Set();

  for (const rawStmt of clean.split(';')) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;
    // Skip area[...] lookup definitions so city names aren't treated as POI tag filters
    if (/^\s*area\b/i.test(stmt)) continue;

    const assignMatch = stmt.match(/->\s*\.([a-zA-Z0-9_]+)\s*$/);
    const assignedSet = assignMatch ? assignMatch[1] : null;
    const isSubtracted = assignedSet && subtractedSets.has(assignedSet);

    for (const pred of parseBracketPredicates(stmt)) {
      if (pred.op === 'if') {
        anatomy.push({kind: 'Filter', label: `if:${pred.val}`, tone: 'neutral'});
        continue;
      }
      const negated = isSubtracted || pred.op === '!=' || pred.op === '!~' || pred.op === '!exists';
      const sig = `${negated ? '!' : ''}${pred.key}${pred.op}${pred.val}`;
      if (seenFilterKeys.has(sig)) continue;
      seenFilterKeys.add(sig);

      if (negated) {
        excludedFilters.push(pred);
      } else {
        let regex = null;
        if (pred.op === '~') {
          try { regex = new RegExp(pred.val, pred.caseInsensitive ? 'i' : ''); } catch {}
        }
        positiveFilters.push({...pred, regex});
      }
    }
  }

  for (const f of positiveFilters.slice(0, 5)) {
    const display = f.op === 'exists' ? `${f.key}=*` : `${f.key}${f.op}${f.val}`;
    anatomy.push({kind: 'Tag', label: display, tone: 'accent'});
  }
  for (const f of excludedFilters.slice(0, 3)) {
    const display = f.op === '!exists' ? `no ${f.key}` : `${f.key}${f.op}${f.val}`;
    anatomy.push({kind: 'Exclude', label: display, tone: 'amber'});
  }

  // 4. Set difference & output mode
  SUBTRACT_RE.lastIndex = 0;
  let sm;
  while ((sm = SUBTRACT_RE.exec(clean)) !== null) {
    anatomy.push({kind: 'Set Op', label: `.${sm[1]} − .${sm[2]}`, tone: 'amber'});
  }

  OUT_RE.lastIndex = 0;
  let lastOut = null, om;
  while ((om = OUT_RE.exec(clean)) !== null) lastOut = om[1].trim();
  if (lastOut) {
    anatomy.push({kind: 'Out', label: `out ${lastOut}`.slice(0, 26), tone: 'neutral'});
  }

  return {anatomy, positiveFilters, excludedFilters};
}

export function matchFeatureTags(tags = {}, parsedQuery = null) {
  const filters = parsedQuery?.positiveFilters || [];
  const entries = Object.entries(tags).filter(([k, v]) => v !== undefined && v !== null && String(v) !== '');
  const matchedKeys = new Set();

  for (const [key, rawVal] of entries) {
    const val = String(rawVal);
    for (const f of filters) {
      if (f.key !== key) continue;
      if (f.op === 'exists') { matchedKeys.add(key); break; }
      if (f.op === '=' && val === f.val) { matchedKeys.add(key); break; }
      if (f.op === '~' && f.regex && f.regex.test(val)) { matchedKeys.add(key); break; }
    }
  }

  const sortedEntries = entries
    .map(([key, value]) => ({key, value: String(value), matched: matchedKeys.has(key)}))
    .sort((a, b) => (Number(b.matched) - Number(a.matched)) || a.key.localeCompare(b.key));

  return {matchedKeys, sortedEntries};
}

export function safeTagHref(key, value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (['website', 'contact:website', 'url'].includes(key) && /^https?:\/\/[^\s<>"]+$/i.test(v)) {
    return v;
  }
  if (key === 'wikidata' && /^Q\d+$/.test(v)) {
    return `https://www.wikidata.org/wiki/${v}`;
  }
  if (key === 'wikipedia') {
    const m = v.match(/^([a-z]{2,3}):(.+)$/i);
    if (m) return `https://${m[1].toLowerCase()}.wikipedia.org/wiki/${encodeURIComponent(m[2].replace(/ /g, '_'))}`;
  }
  return null;
}

export function renderAnatomyBar(container, rawQuery) {
  if (!container) return;
  container.replaceChildren();
  const {anatomy} = parseOverpassQuery(rawQuery);
  if (!anatomy.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  for (const item of anatomy) {
    const pill = document.createElement('span');
    pill.className = `anatomy-pill tone-${item.tone || 'neutral'}`;
    const k = document.createElement('b');
    k.textContent = item.kind;
    const v = document.createElement('span');
    v.textContent = item.label;
    pill.append(k, v);
    container.append(pill);
  }
}

const TOKEN_RE = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|\{\{[^}]*\}\}|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|->|\.[a-zA-Z_][a-zA-Z0-9_]*|\b(?:out|timeout|maxsize|bbox|date|nwr|node|way|relation|rel|area|around|is_in|center|tags|body|skel|ids|count|qt|meta|asc)\b|-?\d+(?:\.\d+)?|[!=~]+|[[\]();,-])/g;

function classifyToken(tok, prevNonSpace) {
  if (tok.startsWith('/*') || tok.startsWith('//')) return 'ovq-comment';
  if (tok.startsWith('{{')) return 'ovq-macro';
  if (tok === '->' || (tok.startsWith('.') && tok.length > 1 && !/^[-0-9]/.test(tok[1]))) return 'ovq-set';
  if (tok.startsWith('"') || tok.startsWith("'")) {
    return prevNonSpace === '[' || prevNonSpace === '!' ? 'ovq-key' : 'ovq-string';
  }
  if (/^-?\d/.test(tok)) return 'ovq-number';
  if (/^(out|timeout|maxsize|bbox|date|center|tags|body|skel|ids|count|qt|meta|asc)$/.test(tok)) return 'ovq-directive';
  if (/^(nwr|node|way|relation|rel|area|around|is_in)$/.test(tok)) return 'ovq-keyword';
  if (/^[!=~]+$/.test(tok)) return 'ovq-op';
  return 'ovq-punct';
}

export function highlightOverpassInto(container, code) {
  if (!container) return;
  const text = String(code ?? '');
  container.replaceChildren();
  let lastIndex = 0;
  let prevNonSpace = '';
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const gap = text.slice(lastIndex, match.index);
      container.append(document.createTextNode(gap));
      const trimmed = gap.trim();
      if (trimmed) prevNonSpace = trimmed.slice(-1);
    }
    const tok = match[0];
    const span = document.createElement('span');
    span.className = classifyToken(tok, prevNonSpace);
    span.textContent = tok;
    container.append(span);
    if (tok.trim()) prevNonSpace = tok;
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    container.append(document.createTextNode(text.slice(lastIndex)));
  }
  // Trailing newline keeps textarea overlay height synchronized when ending with \n
  if (container.dataset.overlay === 'true' && text.endsWith('\n')) {
    container.append(document.createTextNode(' '));
  }
}
