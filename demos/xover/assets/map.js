let map, layer, tileLayer;
let currentFeatures = [];
let currentCollection = {type: 'FeatureCollection', features: []};
let currentEntries = [];
let tileErrors = 0;
let selectedEntry = null;

function appendText(parent, tag, value, className = '') {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function externalLink(parent, label, href) {
  const a = appendText(parent, 'a', label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
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

function featureChips(feature, forPopup = false) {
  const tags = tagsOf(feature);
  const chips = [];
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
  if (!forPopup && tags.opening_hours) chips.push({label: 'Hours', accent: false});
  const osmType = feature.properties?.type;
  if (['node', 'way', 'relation'].includes(osmType)) chips.push({label: osmType, type: true});
  return chips.slice(0, 4);
}

function searchableText(feature) {
  const tags = tagsOf(feature);
  return [
    titleOf(feature),
    addressOf(feature),
    feature.properties?.type,
    tags.amenity,
    tags.railway,
    tags.public_transport,
    tags.leisure,
    tags.cuisine,
    tags.operator,
    tags.network,
    tags['addr:postcode'],
    tags.wheelchair === 'yes' ? 'accessible wheelchair' : '',
    tags.outdoor_seating === 'yes' ? 'outdoor seating' : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

function popup(feature) {
  const div = document.createElement('div');
  div.className = 'scout-popup';
  appendText(div, 'h3', titleOf(feature));
  appendText(div, 'p', addressOf(feature));
  const chips = featureChips(feature, true);
  if (chips.length) {
    const chipWrap = appendText(div, 'div', '', 'popup-tags');
    for (const c of chips) appendText(chipWrap, 'span', c.label, `osm-chip${c.accent ? ' chip-accent' : ''}${c.type ? ' chip-type' : ''}`);
  }
  const tags = tagsOf(feature);
  if (tags.opening_hours) appendText(div, 'p', `Hours: ${tags.opening_hours}`);
  const links = appendText(div, 'div', '', 'popup-links');
  externalLink(links, 'View on OSM ↗', osmUrl(feature));
  const point = featurePoint(feature);
  if (point) externalLink(links, 'Street View ↗', `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point[0]},${point[1]}`);
  return div;
}

export function setBasemap(name) {
  const container = document.getElementById('map');
  if (container) container.dataset.theme = ['paper', 'standard', 'mono'].includes(name) ? name : 'paper';
}

export function initMap() {
  if (!window.L || !window.osmtogeojson) throw new Error('The map assets could not load. Refresh the page to try again.');
  setBasemap('paper');
  map = L.map('map', {zoomControl: false, scrollWheelZoom: true, worldCopyJump: true}).setView([40.705, 17.339], 14);
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
}

export function setView(center, zoom) { if (map) map.setView(center, zoom, {animate: false}); }
export function bbox() { return map ? map.getBounds().toBBoxString().split(',').map(Number).map((_, i, arr) => arr[[1, 0, 3, 2][i]]).join(',') : '40.68,17.30,40.73,17.38'; }
export function fitResults() {
  if (layer && layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), {padding: [48, 48], maxZoom: 16});
}
export function invalidate() { map?.invalidateSize(); }

export function clearResults() {
  selectedEntry = null;
  currentEntries = [];
  if (layer) map.removeLayer(layer);
  layer = null;
  currentFeatures = [];
  currentCollection = {type: 'FeatureCollection', features: []};
  document.getElementById('result-list').replaceChildren();
  document.getElementById('map-empty').hidden = true;
}

export function filterResults(rawQuery = '') {
  const query = rawQuery.trim().toLowerCase();
  let shown = 0;
  const list = document.getElementById('result-list');
  list.querySelector('.list-filter-empty')?.remove();
  for (const entry of currentEntries) {
    const match = !query || entry.search.includes(query);
    entry.row.hidden = !match;
    entry.marker.getElement()?.classList.toggle('dimmed', !match);
    if (match) shown++;
  }
  if (currentEntries.length && shown === 0) {
    const empty = appendText(list, 'p', `No matched places contain “${rawQuery.trim()}”.`, 'list-empty list-filter-empty');
    empty.dataset.filterEmpty = 'true';
  }
  return {shown, total: currentEntries.length, filtered: Boolean(query)};
}

export function renderResults(result) {
  const collection = normalizeResult(result);
  clearResults();
  currentCollection = collection;
  currentFeatures = collection.features.filter(f => f.geometry);
  layer = L.featureGroup().addTo(map);
  const list = document.getElementById('result-list');

  currentFeatures.forEach((feature, index) => {
    const point = featurePoint(feature);
    if (!point) return;
    const number = index + 1;
    const marker = L.marker(point, {
      icon: L.divIcon({className: 'scout-marker', html: `<span>${number}</span>`, iconSize: [26, 26], iconAnchor: [13, 13]})
    });
    marker.bindPopup(popup(feature));
    layer.addLayer(marker);

    const row = document.createElement('article');
    row.className = 'result-item';
    const locate = document.createElement('button');
    locate.type = 'button';
    locate.className = 'result-select';
    locate.setAttribute('aria-label', `Locate ${titleOf(feature)} on map`);
    locate.setAttribute('aria-pressed', 'false');

    appendText(locate, 'span', String(number), 'result-number');
    const body = appendText(locate, 'div', '', 'result-body');
    const titleRow = appendText(body, 'div', '', 'result-title-row');
    appendText(titleRow, 'h3', titleOf(feature));
    appendText(body, 'p', addressOf(feature));

    const chips = featureChips(feature, false);
    if (chips.length) {
      const chipWrap = appendText(body, 'div', '', 'result-tags');
      for (const c of chips) appendText(chipWrap, 'span', c.label, `osm-chip${c.accent ? ' chip-accent' : ''}${c.type ? ' chip-type' : ''}`);
    }

    const arrow = appendText(locate, 'span', '↗', 'result-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    row.append(locate);
    list.append(row);

    const entry = {marker, locate, row, search: searchableText(feature)};
    currentEntries.push(entry);

    const select = fromMap => {
      if (selectedEntry) {
        selectedEntry.locate.setAttribute('aria-pressed', 'false');
        selectedEntry.marker.getElement()?.classList.remove('selected');
        selectedEntry.marker.setZIndexOffset(0);
      }
      selectedEntry = entry;
      locate.setAttribute('aria-pressed', 'true');
      marker.getElement()?.classList.add('selected');
      marker.setZIndexOffset(1000);
      if (fromMap && !row.hidden) {
        const bounds = row.getBoundingClientRect(), container = list.getBoundingClientRect();
        if (bounds.top < container.top) list.scrollTop -= container.top - bounds.top;
        else if (bounds.bottom > container.bottom) list.scrollTop += bounds.bottom - container.bottom;
      }
    };

    row.addEventListener('mouseenter', () => {
      marker.getElement()?.classList.add('hovered');
      if (selectedEntry !== entry) marker.setZIndexOffset(600);
    });
    row.addEventListener('mouseleave', () => {
      marker.getElement()?.classList.remove('hovered');
      if (selectedEntry !== entry) marker.setZIndexOffset(0);
    });

    marker.on('popupopen', () => select(true));
    locate.addEventListener('click', () => {
      select(false);
      map.setView(point, 16);
      marker.openPopup();
      if (window.matchMedia('(max-width:820px)').matches) document.getElementById('map-stage').scrollIntoView({block: 'center'});
    });

    if (!['Point', 'MultiPoint'].includes(feature.geometry.type)) {
      const geometry = L.geoJSON(feature, {style: {color: '#1d6350', weight: 2.2, fillOpacity: 0.14}});
      geometry.on('click', () => { select(true); marker.openPopup(); });
      layer.addLayer(geometry);
    }
  });

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
  return {count: total, features: currentFeatures.length, isCount: Boolean(countItem)};
}

export function exportGeoJSON() {
  const blob = new Blob([JSON.stringify(currentCollection, null, 2)], {type: 'application/geo+json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'xover-results.geojson';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
