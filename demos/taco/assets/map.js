import {parseOverpassQuery, matchFeatureTags, safeTagHref} from './osm-tools.js';

let map, layer, footprintGroup, spiderGroup, clusterGroup, markerGroup, tileLayer;
let allBounds = null;
let currentFeatures = [];
let currentCollection = {type: 'FeatureCollection', features: []};
let currentEntries = [];
let tileErrors = 0;
let selectedEntry = null;
let clusteringEnabled = true;
let spiderfiedKey = null;
let parsedActiveQuery = null;

function appendText(parent, tag, value, className = '') {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function externalLink(parent, label, href, className = '') {
  const a = appendText(parent, 'a', label, className);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function featurePoint(feature) {
  if (feature.geometry?.type === 'Point') return [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
  const bounds = L.geoJSON(feature).getBounds();
  if (!bounds.isValid()) return null;
  const center = bounds.getCenter();
  return [center.lat, center.lng];
}

function normalizeResult(result) {
  if (result.type === 'FeatureCollection') return result;
  // Preserve OSM type/ID identity when out center omits polygon geometry.
  const elements = (result.elements || []).filter(e => e.type !== 'count');
  const collection = window.osmtogeojson({...result, elements: elements.filter(e => !e.center)}, {flatProperties: false});
  for (const element of elements.filter(e => e.center)) collection.features.push({
    type: 'Feature',
    id: `${element.type}/${element.id}`,
    properties: {type: element.type, id: element.id, tags: element.tags || {}},
    geometry: {type: 'Point', coordinates: [element.center.lon, element.center.lat]}
  });
  collection.features.forEach(feature => {
    const p = feature.properties || {};
    p.osm_url = `https://www.openstreetmap.org/${p.type}/${p.id}`;
  });
  return collection;
}

function tagsOf(feature) { return feature.properties?.tags || feature.properties || {}; }

function titleOf(feature) {
  const tags = tagsOf(feature);
  return tags.name || tags['name:en'] || tags.brand || `Unnamed ${tags.amenity || tags.leisure || tags.railway || tags.highway || tags.shop || 'OSM feature'}`;
}

function osmUrl(feature) {
  const p = feature.properties || {};
  if (['node', 'way', 'relation'].includes(p.type) && /^\d+$/.test(String(p.id))) return `https://www.openstreetmap.org/${p.type}/${p.id}`;
  return 'https://www.openstreetmap.org/';
}

function addressOf(feature) {
  const tags = tagsOf(feature);
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:city'] || tags.network || tags.operator].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  const kind = tags.amenity || tags.railway || tags.public_transport || tags.highway || tags.leisure || tags.tourism || tags.shop;
  return kind ? kind.replaceAll('_', ' ') : 'OpenStreetMap feature';
}

function featureChips(feature, matchedCount = 0, forPopup = false) {
  const tags = tagsOf(feature);
  const chips = [];
  if (!forPopup && matchedCount > 0) {
    chips.push({label: `✓ ${matchedCount} tag${matchedCount > 1 ? 's' : ''}`, matched: true});
  }
  if (tags.wheelchair === 'yes') chips.push({label: 'Wheelchair', accent: true});
  else if (tags.wheelchair === 'limited') chips.push({label: 'Step-free partial', accent: false});
  if (tags.outdoor_seating === 'yes') chips.push({label: 'Outdoor', accent: true});
  if (tags.railway || tags.public_transport) {
    const transit = (tags.railway || tags.public_transport).replaceAll('_', ' ');
    chips.push({label: transit, accent: false});
  } else if (tags.cuisine) {
    const first = String(tags.cuisine).split(';')[0].trim().replaceAll('_', ' ');
    if (first) chips.push({label: first, accent: false});
  }
  if (tags.access && tags.access !== 'yes') chips.push({label: `access: ${tags.access}`, accent: false});
  if (!forPopup && tags.opening_hours) chips.push({label: 'Hours', accent: false});
  const osmType = feature.properties?.type;
  if (['node', 'way', 'relation'].includes(osmType)) chips.push({label: osmType, type: true, isArea: osmType !== 'node'});
  return chips.slice(0, 5);
}

function searchableText(feature) {
  const tags = tagsOf(feature);
  const kvText = Object.entries(tags).map(([k, v]) => `${k}=${v} ${k} ${v}`).join(' ');
  return [
    titleOf(feature),
    addressOf(feature),
    feature.properties?.type,
    kvText,
    tags.wheelchair === 'yes' ? 'accessible wheelchair' : '',
    tags.outdoor_seating === 'yes' ? 'outdoor seating' : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function popup(feature) {
  const div = document.createElement('div');
  div.className = 'scout-popup';

  const head = appendText(div, 'div', '', 'popup-head');
  appendText(head, 'h3', titleOf(feature));
  const p = feature.properties || {};
  if (['node', 'way', 'relation'].includes(p.type) && p.id !== undefined) {
    appendText(head, 'span', `${p.type}/${p.id}`, 'popup-osm-id');
  }

  appendText(div, 'p', addressOf(feature));

  const tags = tagsOf(feature);
  const {matchedKeys, sortedEntries} = matchFeatureTags(tags, parsedActiveQuery);

  // Highlighted query-matched k=v tags
  const matchedList = sortedEntries.filter(item => item.matched);
  if (matchedList.length) {
    const matchBox = appendText(div, 'div', '', 'popup-matched-box');
    appendText(matchBox, 'div', 'Matched query filters', 'popup-matched-title');
    for (const item of matchedList.slice(0, 4)) {
      const row = appendText(matchBox, 'div', '', 'popup-kv-pill');
      appendText(row, 'span', '✓', 'kv-check');
      appendText(row, 'code', `${item.key}=${item.value}`);
    }
  } else {
    const chips = featureChips(feature, 0, true);
    if (chips.length) {
      const chipWrap = appendText(div, 'div', '', 'popup-tags');
      for (const c of chips) appendText(chipWrap, 'span', c.label, `osm-chip${c.accent ? ' chip-accent' : ''}${c.type ? ' chip-type' : ''}`);
    }
  }

  if (tags.opening_hours) appendText(div, 'p', `Hours: ${tags.opening_hours}`);

  // Expandable full raw OSM k=v dictionary
  if (sortedEntries.length) {
    const details = document.createElement('details');
    details.className = 'popup-raw-tags';
    const summary = appendText(details, 'summary', `Raw OSM tags (${sortedEntries.length})`);
    summary.title = 'Inspect full OpenStreetMap key=value dictionary on this element';
    const table = appendText(details, 'div', '', 'raw-tag-list');
    for (const item of sortedEntries) {
      const tr = appendText(table, 'div', '', `raw-tag-row${item.matched ? ' is-matched' : ''}`);
      appendText(tr, 'span', item.matched ? `✓ ${item.key}` : item.key, 'raw-tag-key');
      const href = safeTagHref(item.key, item.value);
      if (href) {
        externalLink(tr, `${item.value} ↗`, href, 'raw-tag-link');
      } else {
        appendText(tr, 'span', item.value, 'raw-tag-val');
      }
    }
    div.append(details);
    details.addEventListener('toggle', () => {
      if (details.open) requestAnimationFrame(() => map?._popup?._adjustPan?.());
    });
  }

  const links = appendText(div, 'div', '', 'popup-links');
  externalLink(links, 'View on OSM ↗', osmUrl(feature));
  const point = featurePoint(feature);
  if (point) externalLink(links, 'Street View ↗', `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point[0]},${point[1]}`);
  return div;
}

function clusterKeyOf(entries) {
  return entries.map(e => e.number).sort((a, b) => a - b).join('-');
}

function updateClusters() {
  if (!map || !markerGroup || !clusterGroup || !spiderGroup) return;
  spiderGroup.clearLayers();
  clusterGroup.clearLayers();

  const activeEntries = currentEntries.filter(e => !e.filteredOut);
  const hiddenEntries = currentEntries.filter(e => e.filteredOut);

  // Filtered-out entries stay dimmed at true coordinates only when unclustered or hidden cleanly
  for (const e of hiddenEntries) {
    if (markerGroup.hasLayer(e.marker)) markerGroup.removeLayer(e.marker);
  }

  if (!clusteringEnabled || currentEntries.length <= 3) {
    for (const e of activeEntries) {
      e.marker.setLatLng(e.point);
      if (!markerGroup.hasLayer(e.marker)) markerGroup.addLayer(e.marker);
      e.marker.getElement()?.classList.remove('dimmed');
    }
    for (const e of hiddenEntries) {
      e.marker.setLatLng(e.point);
      if (!markerGroup.hasLayer(e.marker)) markerGroup.addLayer(e.marker);
      e.marker.getElement()?.classList.add('dimmed');
    }
    return;
  }

  // Greedy screen-space pixel clustering (radius = 30px)
  const projected = activeEntries.map(entry => ({
    entry,
    px: map.latLngToLayerPoint(entry.point),
  }));
  const used = new Set();
  const clusters = [];
  const RADIUS_SQ = 30 * 30;

  for (let i = 0; i < projected.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const group = [projected[i]];
    for (let j = i + 1; j < projected.length; j++) {
      if (used.has(j)) continue;
      const dx = projected[i].px.x - projected[j].px.x;
      const dy = projected[i].px.y - projected[j].px.y;
      if (dx * dx + dy * dy <= RADIUS_SQ) {
        used.add(j);
        group.push(projected[j]);
      }
    }
    clusters.push(group);
  }

  for (const group of clusters) {
    if (group.length === 1) {
      const {entry} = group[0];
      entry.marker.setLatLng(entry.point);
      if (!markerGroup.hasLayer(entry.marker)) markerGroup.addLayer(entry.marker);
      if (entry === selectedEntry) entry.marker.getElement()?.classList.add('selected');
      continue;
    }

    const entries = group.map(g => g.entry);
    const key = clusterKeyOf(entries);
    const hasSelected = entries.includes(selectedEntry);

    if (spiderfiedKey === key || hasSelected) {
      spiderfiedKey = key;
      // Fan overlapping markers out in a crisp radial ring with leader lines
      const cx = group.reduce((s, g) => s + g.px.x, 0) / group.length;
      const cy = group.reduce((s, g) => s + g.px.y, 0) / group.length;
      const centerLatLng = map.layerPointToLatLng(L.point(cx, cy));
      const radiusPx = Math.min(54, 24 + group.length * 4.5);

      L.circleMarker(centerLatLng, {
        radius: 3.5,
        color: '#1d6350',
        weight: 1.5,
        fillColor: '#ffffff',
        fillOpacity: 1,
      }).addTo(spiderGroup);

      entries.forEach((entry, idx) => {
        const angle = (2 * Math.PI * idx) / entries.length - Math.PI / 2;
        const targetPt = L.point(cx + radiusPx * Math.cos(angle), cy + radiusPx * Math.sin(angle));
        const spiderLatLng = map.layerPointToLatLng(targetPt);
        L.polyline([entry.point, spiderLatLng], {
          color: '#1d6350',
          weight: 1.4,
          dashArray: '3,3',
          opacity: 0.72,
        }).addTo(spiderGroup);
        entry.marker.setLatLng(spiderLatLng);
        if (!markerGroup.hasLayer(entry.marker)) markerGroup.addLayer(entry.marker);
        if (entry === selectedEntry) {
          entry.marker.getElement()?.classList.add('selected');
          entry.marker.setZIndexOffset(1000);
        }
      });
    } else {
      // Collapse into a clean cluster badge
      for (const entry of entries) {
        if (markerGroup.hasLayer(entry.marker)) markerGroup.removeLayer(entry.marker);
      }
      const lat = entries.reduce((s, e) => s + e.point[0], 0) / entries.length;
      const lng = entries.reduce((s, e) => s + e.point[1], 0) / entries.length;
      const previewNums = entries.slice(0, 5).map(e => `#${e.number}`).join(', ') + (entries.length > 5 ? '…' : '');
      const clusterMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'scout-cluster',
          html: `<span><b>⊕ ${entries.length}</b></span>`,
          iconSize: [44, 28],
          iconAnchor: [22, 14],
        }),
        zIndexOffset: 450,
      });
      clusterMarker.on('add', () => {
        const el = clusterMarker.getElement();
        if (el) el.title = `${entries.length} nearby places (${previewNums}) · click to expand`;
      });
      clusterMarker.on('click', ev => {
        L.DomEvent.stopPropagation(ev);
        const bounds = L.latLngBounds(entries.map(e => e.point));
        const spreadMeters = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
        if (map.getZoom() < 16 && spreadMeters > 35) {
          map.flyToBounds(bounds, {padding: [64, 64], maxZoom: 16, duration: 0.4});
        } else {
          spiderfiedKey = key;
          updateClusters();
        }
      });
      clusterGroup.addLayer(clusterMarker);
    }
  }
}

export function setClustering(enabled) {
  clusteringEnabled = Boolean(enabled);
  spiderfiedKey = null;
  updateClusters();
  return clusteringEnabled;
}

export function setActiveQueryForTags(rawQuery = '') {
  parsedActiveQuery = parseOverpassQuery(rawQuery);
}

export function setBasemap(name) {
  const container = document.getElementById('map');
  if (container) container.dataset.theme = ['paper', 'standard', 'mono'].includes(name) ? name : 'paper';
}

export function initMap() {
  if (!window.L || !window.osmtogeojson) throw new Error('The map assets could not load. Refresh the page to try again.');
  setBasemap('paper');
  map = L.map('map', {zoomControl: false, scrollWheelZoom: true, worldCopyJump: true}).setView([53.55, 9.99], 13);
  L.control.zoom({position: 'topright'}).addTo(map);
  L.control.scale({position: 'bottomleft', imperial: false}).addTo(map);
  tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
  }).addTo(map);
  tileLayer.on('tileerror', () => {
    tileErrors++;
    if (tileErrors === 6) document.getElementById('map-badge-text').textContent = 'Basemap unavailable · results still work';
  });
  map.on('zoomend', () => {
    spiderfiedKey = null;
    updateClusters();
  });
  map.on('click', () => {
    if (spiderfiedKey && !selectedEntry) {
      spiderfiedKey = null;
      updateClusters();
    }
  });
}

export function setView(center, zoom) { if (map) map.setView(center, zoom, {animate: false}); }
export function bbox() { return map ? map.getBounds().toBBoxString().split(',').map(Number).map((_, i, arr) => arr[[1, 0, 3, 2][i]]).join(',') : '53.50,9.90,53.60,10.06'; }
export function fitResults() {
  if (allBounds && allBounds.isValid()) map.fitBounds(allBounds, {padding: [48, 48], maxZoom: 16});
  else if (layer && layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), {padding: [48, 48], maxZoom: 16});
}
export function invalidate() { map?.invalidateSize(); }

function updateGeometrySummary(types) {
  const el = document.getElementById('geom-summary');
  if (!el) return;
  const parts = [];
  if (types.node) parts.push(`${types.node} ${types.node === 1 ? 'node' : 'nodes'}`);
  if (types.way) parts.push(`${types.way} ${types.way === 1 ? 'way' : 'ways'}`);
  if (types.relation) parts.push(`${types.relation} ${types.relation === 1 ? 'rel' : 'rels'}`);
  el.textContent = parts.join(' · ');
  el.hidden = parts.length === 0;
}

export function clearResults() {
  selectedEntry = null;
  spiderfiedKey = null;
  allBounds = null;
  currentEntries = [];
  if (layer) map.removeLayer(layer);
  layer = null;
  footprintGroup = null;
  spiderGroup = null;
  clusterGroup = null;
  markerGroup = null;
  currentFeatures = [];
  currentCollection = {type: 'FeatureCollection', features: []};
  document.getElementById('result-list').replaceChildren();
  document.getElementById('map-empty').hidden = true;
  updateGeometrySummary({node: 0, way: 0, relation: 0});
}

export function filterResults(rawQuery = '') {
  const query = rawQuery.trim().toLowerCase();
  let shown = 0;
  const list = document.getElementById('result-list');
  list.querySelector('.list-filter-empty')?.remove();
  for (const entry of currentEntries) {
    const match = !query || entry.search.includes(query);
    entry.filteredOut = !match;
    entry.row.hidden = !match;
    if (match) shown++;
  }
  spiderfiedKey = null;
  updateClusters();
  if (currentEntries.length && shown === 0) {
    const empty = appendText(list, 'p', `No matched places contain “${rawQuery.trim()}”.`, 'list-empty list-filter-empty');
    empty.dataset.filterEmpty = 'true';
  }
  return {shown, total: currentEntries.length, filtered: Boolean(query)};
}

export function renderResults(result, activeQuery = '') {
  parsedActiveQuery = parseOverpassQuery(activeQuery);
  const collection = normalizeResult(result);
  clearResults();
  currentCollection = collection;
  currentFeatures = collection.features.filter(f => f.geometry);

  layer = L.featureGroup().addTo(map);
  footprintGroup = L.featureGroup().addTo(layer);
  spiderGroup = L.featureGroup().addTo(layer);
  clusterGroup = L.featureGroup().addTo(layer);
  markerGroup = L.featureGroup().addTo(layer);

  const list = document.getElementById('result-list');
  const types = {node: 0, way: 0, relation: 0};
  const boundsPoints = [];

  currentFeatures.forEach((feature, index) => {
    const point = featurePoint(feature);
    if (!point) return;
    boundsPoints.push(point);

    const osmType = feature.properties?.type;
    if (osmType in types) types[osmType]++;
    const isArea = osmType === 'way' || osmType === 'relation';

    const number = index + 1;
    const marker = L.marker(point, {
      icon: L.divIcon({
        className: `scout-marker${isArea ? ' is-area' : ''}`,
        html: `<span>${number}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
    });
    marker.bindPopup(() => popup(feature), {
      maxWidth: 325,
      autoPanPaddingTopLeft: [20, 78],
      autoPanPaddingBottomRight: [20, 56],
    });
    markerGroup.addLayer(marker);

    const {matchedKeys} = matchFeatureTags(tagsOf(feature), parsedActiveQuery);

    const row = document.createElement('article');
    row.className = 'result-item';
    const locate = document.createElement('button');
    locate.type = 'button';
    locate.className = 'result-select';
    locate.setAttribute('aria-label', `Locate ${titleOf(feature)} on map`);
    locate.setAttribute('aria-pressed', 'false');

    appendText(locate, 'span', String(number), `result-number${isArea ? ' is-area' : ''}`);
    const body = appendText(locate, 'div', '', 'result-body');
    const titleRow = appendText(body, 'div', '', 'result-title-row');
    appendText(titleRow, 'h3', titleOf(feature));
    appendText(body, 'p', addressOf(feature));

    const chips = featureChips(feature, matchedKeys.size, false);
    if (chips.length) {
      const chipWrap = appendText(body, 'div', '', 'result-tags');
      for (const c of chips) {
        const cls = [
          'osm-chip',
          c.matched ? 'chip-matched' : '',
          c.accent ? 'chip-accent' : '',
          c.type ? 'chip-type' : '',
          c.isArea ? 'chip-area' : '',
        ].filter(Boolean).join(' ');
        appendText(chipWrap, 'span', c.label, cls);
      }
    }

    const arrow = appendText(locate, 'span', '↗', 'result-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    row.append(locate);
    list.append(row);

    let geometryLayer = null;
    if (!['Point', 'MultiPoint'].includes(feature.geometry.type)) {
      geometryLayer = L.geoJSON(feature, {
        style: {color: '#1d6350', weight: 2.2, fillColor: '#1d6350', fillOpacity: 0.15}
      });
      const gBounds = geometryLayer.getBounds();
      if (gBounds.isValid()) {
        boundsPoints.push([gBounds.getSouth(), gBounds.getWest()], [gBounds.getNorth(), gBounds.getEast()]);
      }
      footprintGroup.addLayer(geometryLayer);
    }

    const entry = {number, point, marker, locate, row, geometryLayer, filteredOut: false, search: searchableText(feature)};
    currentEntries.push(entry);

    const highlightFootprint = active => {
      if (!geometryLayer) return;
      geometryLayer.setStyle(active
        ? {color: '#b86e14', weight: 3, fillColor: '#b86e14', fillOpacity: 0.26}
        : {color: '#1d6350', weight: 2.2, fillColor: '#1d6350', fillOpacity: 0.15});
    };

    const select = fromMap => {
      if (selectedEntry && selectedEntry !== entry) {
        selectedEntry.locate.setAttribute('aria-pressed', 'false');
        selectedEntry.marker.getElement()?.classList.remove('selected');
        selectedEntry.marker.setZIndexOffset(0);
        if (selectedEntry.geometryLayer) {
          selectedEntry.geometryLayer.setStyle({color: '#1d6350', weight: 2.2, fillColor: '#1d6350', fillOpacity: 0.15});
        }
      }
      selectedEntry = entry;
      locate.setAttribute('aria-pressed', 'true');
      marker.getElement()?.classList.add('selected');
      marker.setZIndexOffset(1000);
      highlightFootprint(true);
      if (fromMap && !row.hidden) {
        const bounds = row.getBoundingClientRect(), container = list.getBoundingClientRect();
        if (bounds.top < container.top) list.scrollTop -= container.top - bounds.top;
        else if (bounds.bottom > container.bottom) list.scrollTop += bounds.bottom - container.bottom;
      }
    };

    row.addEventListener('mouseenter', () => {
      marker.getElement()?.classList.add('hovered');
      if (selectedEntry !== entry) {
        marker.setZIndexOffset(600);
        highlightFootprint(true);
      }
    });
    row.addEventListener('mouseleave', () => {
      marker.getElement()?.classList.remove('hovered');
      if (selectedEntry !== entry) {
        marker.setZIndexOffset(0);
        highlightFootprint(false);
      }
    });

    marker.on('popupopen', () => select(true));
    marker.on('popupclose', () => {
      if (selectedEntry === entry) {
        selectedEntry.locate.setAttribute('aria-pressed', 'false');
        selectedEntry.marker.getElement()?.classList.remove('selected');
        selectedEntry.marker.setZIndexOffset(0);
        highlightFootprint(false);
        selectedEntry = null;
      }
    });

    if (geometryLayer) {
      geometryLayer.on('click', () => {
        select(true);
        if (!markerGroup.hasLayer(marker)) updateClusters();
        marker.openPopup();
      });
    }

    locate.addEventListener('click', () => {
      select(false);
      map.setView(point, Math.max(map.getZoom(), 16));
      updateClusters();
      marker.openPopup();
      if (window.matchMedia('(max-width:820px)').matches) document.getElementById('map-stage').scrollIntoView({block: 'center'});
    });
  });

  if (boundsPoints.length) {
    allBounds = L.latLngBounds(boundsPoints);
  }
  updateGeometrySummary(types);

  const countItem = (result.elements || []).find(e => e.type === 'count');
  const total = countItem ? Number(countItem.tags?.total || 0) : currentFeatures.length;
  if (!currentFeatures.length) {
    document.getElementById('map-empty').textContent = countItem
      ? `Count query: ${total.toLocaleString()} matching OSM elements. No map geometry was requested.`
      : 'No places matched this query. Try a broader area or different OSM tags.';
    document.getElementById('map-empty').hidden = false;
    appendText(list, 'p', countItem ? `${total.toLocaleString()} matching OSM elements. This query returns a count.` : 'No places matched this query.', 'list-empty');
  }
  fitResults();
  updateClusters();
  return {count: total, features: currentFeatures.length, isCount: Boolean(countItem), types};
}

export function exportGeoJSON(filename = 'osm-taco-results.geojson') {
  const blob = new Blob([JSON.stringify(currentCollection, null, 2)], {type: 'application/geo+json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = typeof filename === 'string' ? filename : 'osm-taco-results.geojson';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
