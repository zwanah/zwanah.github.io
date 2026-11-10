let map, layer;
let currentFeatures = [];
let currentCollection = {type:'FeatureCollection',features:[]};
let tileErrors = 0;
let selectedEntry = null;

function appendText(parent, tag, value) {
  const node = document.createElement(tag);
  node.textContent = value;
  parent.append(node);
  return node;
}
function externalLink(parent, label, href) {
  const a = appendText(parent,'a',label);
  a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
}
function featurePoint(feature) {
  if (feature.geometry?.type === 'Point') return [feature.geometry.coordinates[1],feature.geometry.coordinates[0]];
  const bounds = L.geoJSON(feature).getBounds();
  if (!bounds.isValid()) return null;
  const center = bounds.getCenter();
  return [center.lat,center.lng];
}
function normalizeResult(result) {
  if (result.type === 'FeatureCollection') return result;
  // Preserve OSM type/ID identity when out center omits polygon geometry.
  const elements = (result.elements || []).filter(e => e.type !== 'count');
  const collection = window.osmtogeojson({...result,elements:elements.filter(e=>!e.center)},{flatProperties:false});
  for (const element of elements.filter(e=>e.center)) collection.features.push({
    type:'Feature',id:`${element.type}/${element.id}`,
    properties:{type:element.type,id:element.id,tags:element.tags || {}},
    geometry:{type:'Point',coordinates:[element.center.lon,element.center.lat]}
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
  return tags.name || tags['name:en'] || tags.brand || `Unnamed ${tags.amenity || tags.leisure || tags.shop || 'OSM feature'}`;
}
function osmUrl(feature) {
  const p = feature.properties;
  if (['node','way','relation'].includes(p.type) && /^\d+$/.test(String(p.id))) return `https://www.openstreetmap.org/${p.type}/${p.id}`;
  return 'https://www.openstreetmap.org/';
}
function addressOf(feature) {
  const tags=tagsOf(feature);
  return [tags['addr:street'],tags['addr:housenumber'],tags['addr:city']].filter(Boolean).join(' · ') || tags.amenity?.replaceAll('_',' ') || tags.leisure?.replaceAll('_',' ') || 'OpenStreetMap feature';
}
function popup(feature) {
  const div=document.createElement('div');div.className='scout-popup';
  appendText(div,'h3',titleOf(feature));appendText(div,'p',addressOf(feature));
  const tags=tagsOf(feature);
  if(tags.opening_hours) appendText(div,'p',tags.opening_hours);
  externalLink(div,'View on OSM ↗',osmUrl(feature));
  const point=featurePoint(feature);
  if(point) externalLink(div,'Street View ↗',`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${point[0]},${point[1]}`);
  return div;
}

export function initMap() {
  if (!window.L || !window.osmtogeojson) throw new Error('The map assets could not load. Refresh the page to try again.');
  map=L.map('map',{zoomControl:false,scrollWheelZoom:true,worldCopyJump:true}).setView([53.55,9.99],13);
  L.control.zoom({position:'topright'}).addTo(map);
  L.control.scale({position:'bottomleft',imperial:false}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'}).addTo(map);
  tiles.on('tileerror',()=>{ tileErrors++; if(tileErrors===6) document.getElementById('map-badge-text').textContent='Basemap unavailable · results still work'; });
}
export function setView(center,zoom) { if(map) map.setView(center,zoom,{animate:false}); }
export function bbox() { return map ? map.getBounds().toBBoxString().split(',').map(Number).map((_,i,arr)=>arr[[1,0,3,2][i]]).join(',') : '53.50,9.90,53.60,10.06'; }
export function fitResults() {
  if(layer && layer.getBounds().isValid()) map.fitBounds(layer.getBounds(),{padding:[45,45],maxZoom:16});
}
export function invalidate() { map?.invalidateSize(); }
export function clearResults() {
  selectedEntry=null;
  if(layer) map.removeLayer(layer);
  layer=null; currentFeatures=[];currentCollection={type:'FeatureCollection',features:[]};
  document.getElementById('result-list').replaceChildren();
  document.getElementById('map-empty').hidden=true;
}
export function renderResults(result) {
  const collection=normalizeResult(result);
  clearResults();
  currentCollection=collection;
  currentFeatures=collection.features.filter(f=>f.geometry);
  layer=L.featureGroup().addTo(map);
  const list=document.getElementById('result-list');
  currentFeatures.forEach((feature,index)=>{
    const point=featurePoint(feature);
    if(!point) return;
    const number=index+1;
    const marker=L.marker(point,{icon:L.divIcon({className:'scout-marker',html:`<span>${number}</span>`,iconSize:[27,27],iconAnchor:[13,13]})});
    marker.bindPopup(popup(feature));layer.addLayer(marker);
    const row=document.createElement('article');row.className='result-item';
    const locate=document.createElement('button');locate.type='button';locate.className='result-select';
    locate.setAttribute('aria-label',`Locate ${titleOf(feature)} on map`);
    locate.setAttribute('aria-pressed','false');
    appendText(locate,'span',String(number)).className='result-number';
    const text=appendText(locate,'div','');appendText(text,'h3',titleOf(feature));appendText(text,'p',addressOf(feature));
    const arrow=appendText(locate,'span','↗');arrow.className='result-arrow';arrow.setAttribute('aria-hidden','true');
    row.append(locate);list.append(row);
    const entry={marker,locate,row};
    const select=fromMap=>{
      if(selectedEntry) {
        selectedEntry.locate.setAttribute('aria-pressed','false');
        selectedEntry.marker.getElement()?.classList.remove('selected');
        selectedEntry.marker.setZIndexOffset(0);
      }
      selectedEntry=entry;locate.setAttribute('aria-pressed','true');
      marker.getElement()?.classList.add('selected');marker.setZIndexOffset(1000);
      if(fromMap) {
        const bounds=row.getBoundingClientRect(),container=list.getBoundingClientRect();
        if(bounds.top<container.top) list.scrollTop-=container.top-bounds.top;
        else if(bounds.bottom>container.bottom) list.scrollTop+=bounds.bottom-container.bottom;
      }
    };
    marker.on('popupopen',()=>select(true));
    locate.addEventListener('click',()=>{
      select(false);map.setView(point,16);marker.openPopup();
      if(window.matchMedia('(max-width:820px)').matches) document.getElementById('map-stage').scrollIntoView({block:'center'});
    });
    if(!['Point','MultiPoint'].includes(feature.geometry.type)) {
      const geometry=L.geoJSON(feature,{style:{color:'#3563ed',weight:2,fillOpacity:.12}});
      geometry.on('click',()=>{select(true);marker.openPopup();});layer.addLayer(geometry);
    }
  });
  const countItem=(result.elements || []).find(e=>e.type==='count');
  const total=countItem ? Number(countItem.tags?.total || 0) : currentFeatures.length;
  if(!currentFeatures.length) {
    document.getElementById('map-empty').textContent=countItem ? `Count query: ${total.toLocaleString()} matching OSM elements. No map geometry was requested.` : 'No places matched this query. Try a broader area or different OSM tags.';
    document.getElementById('map-empty').hidden=false;
    const empty=appendText(list,'p',countItem ? `${total.toLocaleString()} matching OSM elements. This query returns a count.` : 'No places matched this query.');empty.className='list-empty';
  }
  fitResults();
  return {count:total,features:currentFeatures.length,isCount:Boolean(countItem)};
}
export function exportGeoJSON() {
  const blob=new Blob([JSON.stringify(currentCollection,null,2)],{type:'application/geo+json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='xover-results.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
