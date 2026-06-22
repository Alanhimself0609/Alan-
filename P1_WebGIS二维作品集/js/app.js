const TDT_KEY = "YOUR_TIANDITU_KEY"; // 如需天地图，将这里替换为自己的密钥
const campusCenter = [29.49718, 106.57655];
const infoPanel = document.getElementById('infoPanel');

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.target).classList.add('active');
    setTimeout(() => { leafletMap.invalidateSize(); if (maplibreMap) maplibreMap.resize(); }, 120);
  });
});

// ---------- Leaflet base map ----------
const leafletMap = L.map('leafletMap', { center: campusCenter, zoom: 13 });
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '© OpenStreetMap contributors'
}).addTo(leafletMap);
const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 20, attribution: '© OpenStreetMap © CARTO'
});
const baseLayers = { 'OSM标准底图': osm, 'Carto浅色底图': carto };
if (TDT_KEY !== 'YOUR_TIANDITU_KEY') {
  baseLayers['天地图矢量底图'] = L.tileLayer(`https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${TDT_KEY}`, {subdomains:'01234567'});
}
L.control.layers(baseLayers, {}, { collapsed: false }).addTo(leafletMap);
L.control.scale({ metric: true, imperial: false }).addTo(leafletMap);

leafletMap.on('mousemove', e => {
  document.getElementById('coordinateBox').innerText = `Lng: ${e.latlng.lng.toFixed(5)}, Lat: ${e.latlng.lat.toFixed(5)}`;
});

// ---------- bookmarks ----------
document.querySelectorAll('.bookmark').forEach(btn => btn.addEventListener('click', () => {
  leafletMap.flyTo([+btn.dataset.lat, +btn.dataset.lng], +btn.dataset.zoom, { duration: 1.2 });
}));

// ---------- distance measurement ----------
let measureOn = false, measurePts = [], measureLine = null;
const measureBtn = document.getElementById('measureBtn');
measureBtn.addEventListener('click', () => {
  measureOn = !measureOn;
  measureBtn.textContent = `距离测量：${measureOn ? '开启' : '关闭'}`;
});
document.getElementById('clearMeasureBtn').addEventListener('click', () => {
  measurePts = [];
  if (measureLine) leafletMap.removeLayer(measureLine);
  document.getElementById('distanceBox').innerText = '测量距离：0 m';
});
leafletMap.on('click', e => {
  if (!measureOn) return;
  measurePts.push(e.latlng);
  if (measureLine) leafletMap.removeLayer(measureLine);
  measureLine = L.polyline(measurePts, { color: '#e46f2a', weight: 4 }).addTo(leafletMap);
  let total = 0;
  for (let i = 1; i < measurePts.length; i++) total += measurePts[i - 1].distanceTo(measurePts[i]);
  document.getElementById('distanceBox').innerText = total > 1000 ? `测量距离：${(total/1000).toFixed(2)} km` : `测量距离：${total.toFixed(0)} m`;
});

function getColor(d) {
  return d > 20000 ? '#800026' : d > 12000 ? '#BD0026' : d > 9000 ? '#E31A1C' : d > 7000 ? '#FC4E2A' : d > 5000 ? '#FD8D3C' : d > 3000 ? '#FEB24C' : '#FED976';
}
function districtStyle(feature) {
  return { fillColor: getColor(feature.properties.density), weight: 1.4, opacity: 1, color: '#fff', dashArray: '3', fillOpacity: 0.72 };
}
function highlight(e) { e.target.setStyle({ weight: 3, color: '#243b53', fillOpacity: .88 }); e.target.bringToFront(); }
function resetHighlight(e) { districtsLayer.resetStyle(e.target); }
function showInfo(props) {
  infoPanel.innerHTML = `<h2>信息面板</h2><p><b>${props.name}</b></p><p>人口密度：${props.density || '-'} 人/km²</p><p>绿地率：${props.greenRate || '-'}；交通指数：${props.transitScore || '-'}</p>`;
}
let districtsLayer;
fetch('data/districts.geojson').then(r => r.json()).then(data => {
  districtsLayer = L.geoJSON(data, {
    style: districtStyle,
    onEachFeature: (feature, layer) => {
      layer.on({ mouseover: highlight, mouseout: resetHighlight, click: () => showInfo(feature.properties) });
      layer.bindTooltip(`${feature.properties.name}：${feature.properties.density} 人/km²`);
    }
  }).addTo(leafletMap);
});

fetch('data/pois.geojson').then(r => r.json()).then(data => {
  const iconEmoji = {study:'📘', activity:'⭐', life:'🏠', sport:'🏀', city:'🏙️', transport:'🚆'};
  L.geoJSON(data, {
    pointToLayer: (feature, latlng) => {
      const type = feature.properties.type;
      const icon = L.divIcon({ html: `<div class="poi-icon ${type}">${iconEmoji[type] || '📍'}</div>`, className: '', iconSize: [28, 28] });
      const radius = 4 + feature.properties.score / 10;
      const marker = L.marker(latlng, { icon });
      const circle = L.circleMarker(latlng, { radius, color:'#12385f', weight:1, fillColor:'#2d73b9', fillOpacity:.25 });
      return L.layerGroup([circle, marker]);
    },
    filter: f => f.properties.score >= 70,
    onEachFeature: (feature, layer) => {
      const p = feature.properties;
      layer.bindPopup(`<h3>${p.name}</h3><p>${p.desc}</p><p>类型：${p.type}；综合指数：${p.score}</p>`);
      layer.bindTooltip(p.name);
    }
  }).addTo(leafletMap);
});

const legend = L.control({position: 'bottomright'});
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'legend'), grades = [0, 3000, 5000, 7000, 9000, 12000, 20000];
  div.innerHTML = '<b>人口密度分级</b><br>';
  for (let i = 0; i < grades.length; i++) {
    div.innerHTML += `<i style="background:${getColor(grades[i] + 1)}"></i>${grades[i]}${grades[i + 1] ? '&ndash;' + grades[i + 1] : '+'}<br>`;
  }
  return div;
};
legend.addTo(leafletMap);

// ---------- MapLibre vector map ----------
let maplibreMap = new maplibregl.Map({
  container: 'maplibreMap',
  style: 'https://demotiles.maplibre.org/style.json',
  center: [106.57655, 29.49718],
  zoom: 15,
  pitch: 55,
  bearing: -20
});
maplibreMap.addControl(new maplibregl.NavigationControl(), 'top-right');
maplibreMap.on('load', async () => {
  const buildingData = await fetch('data/campus_buildings.geojson').then(r => r.json());
  const poiData = await fetch('data/pois.geojson').then(r => r.json());
  maplibreMap.addSource('campus-buildings', { type: 'geojson', data: buildingData });
  maplibreMap.addLayer({
    id: 'campus-building-extrusion', type: 'fill-extrusion', source: 'campus-buildings',
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'energy'], 50, '#74add1', 70, '#fdae61', 90, '#d73027'],
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': 0.78
    }
  });
  maplibreMap.addSource('poi-cluster', { type: 'geojson', data: poiData, cluster: true, clusterMaxZoom: 14, clusterRadius: 45 });
  maplibreMap.addLayer({ id: 'clusters', type: 'circle', source: 'poi-cluster', filter: ['has', 'point_count'], paint: { 'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 10, 30], 'circle-color': '#1e6b8d', 'circle-opacity': .82 }});
  maplibreMap.addLayer({ id: 'cluster-count', type: 'symbol', source: 'poi-cluster', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': '#ffffff' }});
  maplibreMap.addLayer({ id: 'unclustered-point', type: 'circle', source: 'poi-cluster', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 70, 6, 95, 13], 'circle-color': '#e46f2a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 }});
  maplibreMap.on('click', 'campus-building-extrusion', e => {
    const p = e.features[0].properties;
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<b>${p.name}</b><br>功能：${p.function}<br>楼层：${p.floor}<br>高度：${p.height}m<br>能耗指数：${p.energy}`).addTo(maplibreMap);
  });
});
function setBuildingPalette(mode) {
  const color = mode === 'green'
    ? ['interpolate', ['linear'], ['get','energy'], 50, '#d9f0a3', 70, '#78c679', 90, '#006837']
    : ['interpolate', ['linear'], ['get','energy'], 50, '#74add1', 70, '#fdae61', 90, '#d73027'];
  maplibreMap.setPaintProperty('campus-building-extrusion', 'fill-extrusion-color', color);
}
document.getElementById('styleBlue').onclick = () => setBuildingPalette('blue');
document.getElementById('styleGreen').onclick = () => setBuildingPalette('green');
document.getElementById('resetMapLibre').onclick = () => maplibreMap.flyTo({ center:[106.57655,29.49718], zoom:15, pitch:55, bearing:-20 });
