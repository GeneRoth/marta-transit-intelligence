// MARTA Transit Intelligence — P7
// Live buses, trains, rail polylines, paratransit equity, AI narrative, 30s countdown.

var REFRESH_MS = 30000;

var LINE_COLORS = {
  RED: '#e4002b',
  GOLD: '#ffb81c',
  BLUE: '#0057b7',
  GREEN: '#00a651',
};

// Hand-curated rail station coords. Cleaner than extracting from shapes.txt for rail.
var RAIL_STATIONS = {
  NORTH_SPRINGS:   { n: 'North Springs',    c: [-84.3568, 33.9432] },
  SANDY_SPRINGS:   { n: 'Sandy Springs',    c: [-84.3517, 33.9308] },
  DUNWOODY:        { n: 'Dunwoody',         c: [-84.3463, 33.9213] },
  MEDICAL_CENTER:  { n: 'Medical Center',   c: [-84.3508, 33.9091] },
  BUCKHEAD:        { n: 'Buckhead',         c: [-84.3679, 33.8470] },
  LENOX:           { n: 'Lenox',            c: [-84.3584, 33.8459] },
  BROOKHAVEN:      { n: 'Brookhaven',       c: [-84.3380, 33.8569] },
  CHAMBLEE:        { n: 'Chamblee',         c: [-84.3085, 33.8892] },
  DORAVILLE:       { n: 'Doraville',        c: [-84.2832, 33.9024] },
  LINDBERGH:       { n: 'Lindbergh Center', c: [-84.3692, 33.8232] },
  ARTS_CENTER:     { n: 'Arts Center',      c: [-84.3860, 33.7892] },
  MIDTOWN:         { n: 'Midtown',          c: [-84.3862, 33.7811] },
  NORTH_AVE:       { n: 'North Avenue',     c: [-84.3869, 33.7713] },
  CIVIC_CENTER:    { n: 'Civic Center',     c: [-84.3879, 33.7676] },
  PEACHTREE:       { n: 'Peachtree Center', c: [-84.3871, 33.7594] },
  FIVE_POINTS:     { n: 'Five Points',      c: [-84.3917, 33.7538] },
  GARNETT:         { n: 'Garnett',          c: [-84.3935, 33.7491] },
  WEST_END:        { n: 'West End',         c: [-84.4139, 33.7367] },
  OAKLAND_CITY:    { n: 'Oakland City',     c: [-84.4175, 33.7094] },
  LAKEWOOD:        { n: 'Lakewood/Ft McPherson', c: [-84.4268, 33.6975] },
  EAST_POINT:      { n: 'East Point',       c: [-84.4401, 33.6767] },
  COLLEGE_PARK:    { n: 'College Park',     c: [-84.4478, 33.6517] },
  AIRPORT:         { n: 'Airport',          c: [-84.4468, 33.6407] },
  HAMILTON_HOLMES:  { n: 'H.E. Holmes',     c: [-84.4704, 33.7546] },
  WEST_LAKE:       { n: 'West Lake',        c: [-84.4452, 33.7540] },
  ASHBY:           { n: 'Ashby',            c: [-84.4174, 33.7574] },
  VINE_CITY:       { n: 'Vine City',        c: [-84.4080, 33.7566] },
  OMNI:            { n: 'GWCC/CNN Center',  c: [-84.3983, 33.7582] },
  GEORGIA_STATE:   { n: 'Georgia State',    c: [-84.3864, 33.7494] },
  KING_MEMORIAL:   { n: 'King Memorial',    c: [-84.3736, 33.7492] },
  INMAN_PARK:      { n: 'Inman Park',       c: [-84.3525, 33.7578] },
  EDGEWOOD:        { n: 'Edgewood',         c: [-84.3421, 33.7614] },
  EAST_LAKE:       { n: 'East Lake',        c: [-84.3078, 33.7656] },
  DECATUR:         { n: 'Decatur',          c: [-84.2966, 33.7740] },
  AVONDALE:        { n: 'Avondale',         c: [-84.2829, 33.7762] },
  KENSINGTON:      { n: 'Kensington',       c: [-84.2541, 33.7795] },
  INDIAN_CREEK:    { n: 'Indian Creek',     c: [-84.2309, 33.7683] },
  BANKHEAD:        { n: 'Bankhead',         c: [-84.4346, 33.7668] },
};

var RAIL_PATHS = {
  RED: [
    'NORTH_SPRINGS','SANDY_SPRINGS','DUNWOODY','MEDICAL_CENTER','BUCKHEAD','LINDBERGH',
    'ARTS_CENTER','MIDTOWN','NORTH_AVE','CIVIC_CENTER','PEACHTREE','FIVE_POINTS',
    'GARNETT','WEST_END','OAKLAND_CITY','LAKEWOOD','EAST_POINT','COLLEGE_PARK','AIRPORT'
  ],
  GOLD: [
    'DORAVILLE','CHAMBLEE','BROOKHAVEN','LENOX','LINDBERGH',
    'ARTS_CENTER','MIDTOWN','NORTH_AVE','CIVIC_CENTER','PEACHTREE','FIVE_POINTS',
    'GARNETT','WEST_END','OAKLAND_CITY','LAKEWOOD','EAST_POINT','COLLEGE_PARK','AIRPORT'
  ],
  BLUE: [
    'HAMILTON_HOLMES','WEST_LAKE','ASHBY','VINE_CITY','OMNI','FIVE_POINTS',
    'GEORGIA_STATE','KING_MEMORIAL','INMAN_PARK','EDGEWOOD','EAST_LAKE','DECATUR',
    'AVONDALE','KENSINGTON','INDIAN_CREEK'
  ],
  GREEN: [
    'BANKHEAD','ASHBY','VINE_CITY','OMNI','FIVE_POINTS',
    'GEORGIA_STATE','KING_MEMORIAL','EDGEWOOD'
  ],
};

function railGeoJSON() {
  var features = [];
  var lines = Object.keys(RAIL_PATHS);
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li];
    var ids = RAIL_PATHS[line];
    var coords = ids.map(function(id) { return RAIL_STATIONS[id].c; });
    features.push({
      type: 'Feature',
      properties: { line: line, color: LINE_COLORS[line] },
      geometry: { type: 'LineString', coordinates: coords },
    });
  }
  return { type: 'FeatureCollection', features: features };
}

function stationsGeoJSON() {
  var keys = Object.keys(RAIL_STATIONS);
  var features = keys.map(function(id) {
    var s = RAIL_STATIONS[id];
    return {
      type: 'Feature',
      properties: { id: id, name: s.n },
      geometry: { type: 'Point', coordinates: s.c },
    };
  });
  return { type: 'FeatureCollection', features: features };
}

var map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  center: [-84.388, 33.765],
  zoom: 10.4,
  minZoom: 9,
  maxZoom: 17,
  attributionControl: { compact: true },
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

function makeArrowImage() {
  var size = 32;
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(8, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

function initMap() {
  if (map._mapInitialized) return;
  map._mapInitialized = true;
  map.addSource('rail-lines', { type: 'geojson', data: railGeoJSON() });
  map.addLayer({
    id: 'rail-glow', type: 'line', source: 'rail-lines',
    paint: { 'line-color': ['get', 'color'], 'line-width': 10, 'line-opacity': 0.18, 'line-blur': 3 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });
  map.addLayer({
    id: 'rail-line', type: 'line', source: 'rail-lines',
    paint: { 'line-color': ['get', 'color'], 'line-width': 3.2, 'line-opacity': 0.92 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });

  map.addSource('stations', { type: 'geojson', data: stationsGeoJSON() });
  map.addLayer({
    id: 'stations-halo', type: 'circle', source: 'stations',
    paint: {
      'circle-radius': 5, 'circle-color': '#0a0d12',
      'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.2, 'circle-opacity': 1,
    },
  });
  map.addLayer({
    id: 'stations-label', type: 'symbol', source: 'stations', minzoom: 11.2,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#cbd3de', 'text-halo-color': '#0a0d12', 'text-halo-width': 1.2 },
  });

  map.addImage('train-arrow', makeArrowImage(), { pixelRatio: 2 });

  map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'trains', type: 'symbol', source: 'trains',
    layout: {
      'icon-image': 'train-arrow',
      'icon-rotate': ['coalesce', ['get', 'bearing'], 0],
      'icon-rotation-alignment': 'map',
      'icon-size': 0.8,
      'icon-allow-overlap': true,
    },
  });
  map.addLayer({
    id: 'trains-halo', type: 'circle', source: 'trains',
    paint: { 'circle-radius': 9, 'circle-color': ['get', 'color'], 'circle-opacity': 0.55, 'circle-blur': 0.5 },
  }, 'trains');

  map.addSource('buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'buses-glow', type: 'circle', source: 'buses',
    paint: { 'circle-radius': 12, 'circle-color': '#7dd3fc', 'circle-opacity': 0.15, 'circle-blur': 0.4 },
  });
  map.addLayer({
    id: 'buses', type: 'circle', source: 'buses',
    paint: {
      'circle-radius': 7, 'circle-color': '#e0f2fe',
      'circle-stroke-color': '#0284c7', 'circle-stroke-width': 1.5, 'circle-opacity': 0.95,
    },
  });

  map.addSource('selected-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: 'selected-route-glow', type: 'line', source: 'selected-route',
    paint: { 'line-color': '#ff3366', 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 2 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });
  map.addLayer({
    id: 'selected-route-line', type: 'line', source: 'selected-route',
    paint: { 'line-color': '#ff3366', 'line-width': 4, 'line-opacity': 1 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  });

  // Single unified click handler for the whole map
  map.on('click', function(e) {
    // Check buses first (larger query tolerance for easier clicking)
    var busHits = map.queryRenderedFeatures(
      [[e.point.x - 15, e.point.y - 15], [e.point.x + 15, e.point.y + 15]],
      { layers: ['buses'] }
    );
    if (busHits.length > 0) {
      var feature = busHits[0];
      var routeId = feature.properties.route_id;
      var vehicleId = feature.properties.vehicle_id;
      var friendly = friendlyRouteName(routeId);
      var staticId = resolveRouteId(routeId);

      // Clear old state
      map.getSource('selected-route').setData({ type: 'FeatureCollection', features: [] });
      closeAllPopups();

      // Show popup
      var popup = new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div class="popup-title">' + escapeHtml(friendly || '\u2014') + '</div>' +
          '<div class="popup-row">Vehicle <b>' + escapeHtml(vehicleId || '\u2014') + '</b></div>' +
          '<div class="popup-row">' + (staticId ? 'Loading route shape\u2026' : 'No shape data') + '</div>'
        )
        .addTo(map);

      // Fetch and draw route shape
      if (staticId) {
        fetch('/.netlify/functions/gtfs-static?file=shape-for-route&route=' + encodeURIComponent(staticId))
          .then(function(res) { return res.ok ? res.json() : null; })
          .then(function(geo) {
            if (!geo || !geo.features || !geo.features.length) return;
            var clean = { type: 'FeatureCollection', features: geo.features };
            map.getSource('selected-route').setData(clean);
            fitToRoute(clean);
            try {
              popup.setHTML(
                '<div class="popup-title">' + escapeHtml(friendly || '\u2014') + '</div>' +
                '<div class="popup-row">Vehicle <b>' + escapeHtml(vehicleId || '\u2014') + '</b></div>' +
                '<div class="popup-row">Route shape drawn on map.</div>'
              );
            } catch(err) {}
          })
          .catch(function(err) { console.warn('shape fetch failed', err); });
      }
      return;
    }

    // Then check trains
    var trainHits = map.queryRenderedFeatures(e.point, { layers: ['trains'] });
    if (trainHits.length > 0) {
      closeAllPopups();
      var p = trainHits[0].properties;
      new maplibregl.Popup({ closeButton: true, offset: 12 })
        .setLngLat(e.lngLat)
        .setHTML(
          '<div class="popup-title" style="color:' + (LINE_COLORS[p.line] || '#fff') + '">' + escapeHtml(p.line) + ' Line \u00b7 Train ' + escapeHtml(p.train_id || '') + '</div>' +
          '<div class="popup-row">Heading ' + escapeHtml(p.direction || '') + ' to <b>' + escapeHtml(p.destination || '') + '</b></div>' +
          '<div class="popup-row">Next stop <b>' + escapeHtml(p.next_station || '') + '</b> \u00b7 ' + escapeHtml(p.waiting_time || '') + '</div>'
        )
        .addTo(map);
      return;
    }

    // Clicked empty space
    map.getSource('selected-route').setData({ type: 'FeatureCollection', features: [] });
    closeAllPopups();
  });

  map.on('mousemove', function(e) {
    var busHits = map.queryRenderedFeatures(
      [[e.point.x - 10, e.point.y - 10], [e.point.x + 10, e.point.y + 10]],
      { layers: ['buses'] }
    );
    var trainHits = map.queryRenderedFeatures(e.point, { layers: ['trains'] });
    map.getCanvas().style.cursor = (busHits.length > 0 || trainHits.length > 0) ? 'pointer' : '';
  });

  boot();
}

map.on('load', initMap);
map.on('style.load', function() { setTimeout(initMap, 500); });
if (map.isStyleLoaded()) { setTimeout(initMap, 100); }

var state = {
  trains: [],
  buses: [],
  arrivals: [],
  selectedRouteId: null,
  tickStart: Date.now(),
  routeDirectory: {},
  shortNameToId: {},
};

function boot() {
  loadRoutesDirectory();
  refreshAll();
  startCountdown();
}

// Loads the routes directory with retry. The gtfs-static function fetches a 20MB zip
// from MARTA and occasionally returns 500 on first call after a cold start or when
// MARTA's server hiccups. One failure shouldn't permanently break bus-click —
// without the directory, short_name → internal ID resolution fails and every click
// shows "No shape data".
function loadRoutesDirectory(attempt) {
  attempt = attempt || 1;
  var MAX_ATTEMPTS = 6; // up to ~60s of total retry time
  fetchJSON('/.netlify/functions/gtfs-static?file=routes-directory').then(function(dir) {
    if (dir && typeof dir === 'object' && !dir.error && Object.keys(dir).length > 2) {
      state.routeDirectory = dir;
      var keys = Object.keys(dir);
      for (var i = 0; i < keys.length; i++) {
        var sn = dir[keys[i]].short_name;
        if (sn) state.shortNameToId[sn] = keys[i];
      }
      return;
    }
    if (attempt < MAX_ATTEMPTS) {
      // Exponential-ish backoff: 2s, 4s, 8s, 16s, 30s
      var delay = Math.min(30000, 1000 * Math.pow(2, attempt));
      setTimeout(function() { loadRoutesDirectory(attempt + 1); }, delay);
    }
  });
}

function refreshAll() {
  state.tickStart = Date.now();
  Promise.allSettled([
    fetchJSON('/api/rail'),
    fetchJSON('/api/bus'),
  ]).then(function(results) {
    var rail = results[0];
    var bus = results[1];

    if (rail.status === 'fulfilled' && rail.value && !rail.value.error) {
      state.trains = rail.value.trains || [];
      state.arrivals = rail.value.arrivals || [];
      updateTrains();
      updateArrivals();
    }
    if (bus.status === 'fulfilled' && bus.value && !bus.value.error) {
      state.buses = bus.value.vehicles || [];
      updateBuses();
    }

    updateStatusStrip();
    updateEquity();
    updateNarrative();
  });
}

function fetchJSON(url) {
  return fetch(url).then(function(r) {
    if (!r.ok) return null;
    return r.json();
  }).catch(function() { return null; });
}

// Resolve GTFS-RT route_id (short name like "117") to static feed internal ID (like "27383")
function resolveRouteId(rtId) {
  if (state.routeDirectory[rtId]) return rtId;
  if (state.shortNameToId[rtId]) return state.shortNameToId[rtId];
  return null;
}

function friendlyRouteName(routeId) {
  // Try direct match first
  var m = state.routeDirectory[routeId];
  // If not found, try resolving via short_name
  if (!m) {
    var resolved = state.shortNameToId[routeId];
    if (resolved) m = state.routeDirectory[resolved];
  }
  if (!m) return routeId;
  if (m.short_name && m.long_name) return m.short_name + ' \u00b7 ' + m.long_name;
  return m.short_name || m.long_name || routeId;
}

function updateTrains() {
  var features = state.trains
    .filter(function(t) { return Number.isFinite(t.lat) && Number.isFinite(t.lon); })
    .map(function(t) {
      return {
        type: 'Feature',
        properties: {
          train_id: t.train_id,
          line: t.line,
          color: LINE_COLORS[t.line] || '#ffffff',
          destination: t.destination,
          direction: t.direction,
          next_station: t.next_station,
          waiting_time: t.waiting_time,
          bearing: inferBearing(t),
        },
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
      };
    });
  var src = map.getSource('trains');
  if (src) src.setData({ type: 'FeatureCollection', features: features });
}

function inferBearing(t) {
  var dir = (t.direction || '').toUpperCase();
  var map = { N: 0, S: 180, E: 90, W: 270 };
  return map[dir] !== undefined ? map[dir] : 0;
}

function updateBuses() {
  var features = state.buses
    .filter(function(b) { return Number.isFinite(b.lat) && Number.isFinite(b.lon); })
    .map(function(b) {
      return {
        type: 'Feature',
        properties: { vehicle_id: b.vehicle_id, route_id: b.route_id, trip_id: b.trip_id, bearing: b.bearing },
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      };
    });
  var src = map.getSource('buses');
  if (src) src.setData({ type: 'FeatureCollection', features: features });
}

function updateArrivals() {
  var list = document.getElementById('arrivals-list');
  var sorted = state.arrivals.slice()
    .filter(function(a) { return a.WAITING_SECONDS && a.WAITING_SECONDS !== '0'; })
    .sort(function(a, b) { return parseInt(a.WAITING_SECONDS, 10) - parseInt(b.WAITING_SECONDS, 10); })
    .slice(0, 14);
  if (!sorted.length) {
    list.innerHTML = '<li style="color:var(--fg-mute); border:none; justify-content:center">No live arrivals.</li>';
    return;
  }
  list.innerHTML = sorted.map(function(a) {
    var color = LINE_COLORS[a.LINE] || '#ffffff';
    var secs = parseInt(a.WAITING_SECONDS, 10);
    var cls = secs <= 60 ? 'arriving' : secs <= 240 ? 'soon' : '';
    var eta = (a.WAITING_TIME === 'Arriving' || secs <= 30) ? 'Arriving' : a.WAITING_TIME;
    return '<li>' +
      '<span class="line-chip" style="--lc:' + color + '"></span>' +
      '<div>' +
        '<div class="station">' + escapeHtml(a.STATION || '') + '</div>' +
        '<div class="dest">' + escapeHtml(a.DIRECTION || '') + ' \u00b7 to ' + escapeHtml(a.DESTINATION || '') + '</div>' +
      '</div>' +
      '<span class="eta ' + cls + '">' + escapeHtml(eta || '\u2014') + '</span>' +
    '</li>';
  }).join('');
}

function updateStatusStrip() {
  document.getElementById('train-count').textContent = state.trains.length || '0';
  document.getElementById('bus-count').textContent = state.buses.length || '0';
  var routeSet = {};
  state.buses.forEach(function(b) { if (b.route_id) routeSet[b.route_id] = true; });
  document.getElementById('route-count').textContent = Object.keys(routeSet).length || '0';
}

function updateEquity() {
  var buses = state.buses.filter(function(b) { return Number.isFinite(b.lat) && Number.isFinite(b.lon); });
  document.getElementById('eq-buses').textContent = buses.length.toLocaleString();

  var bins = {};
  buses.forEach(function(b) {
    var lat = Math.round(b.lat * 100) / 100;
    var lon = Math.round(b.lon * 100) / 100;
    bins[lat + ',' + lon] = true;
  });
  var buffered = {};
  Object.keys(bins).forEach(function(key) {
    var parts = key.split(',');
    var la = Number(parts[0]);
    var lo = Number(parts[1]);
    for (var dy = -1; dy <= 1; dy++) {
      for (var dx = -1; dx <= 1; dx++) {
        buffered[(la + dy * 0.01).toFixed(2) + ',' + (lo + dx * 0.01).toFixed(2)] = true;
      }
    }
  });
  var tractsEstimate = Object.keys(buffered).length;
  document.getElementById('eq-tracts').textContent = tractsEstimate.toLocaleString();

  var popPerTract = 3900;
  var pop = tractsEstimate * popPerTract;
  document.getElementById('eq-pop').textContent = compactNum(pop);

  var serviceAreaPop = 1500000;
  var coverage = Math.min(1, pop / serviceAreaPop);
  document.getElementById('eq-bar').style.width = (coverage * 100).toFixed(0) + '%';
}

function updateNarrative() {
  var now = new Date();
  var hour = now.getHours();
  var dow = now.getDay();
  var timePhrase = hour < 6 ? 'pre-dawn' :
    hour < 10 ? 'morning rush' :
    hour < 15 ? 'midday' :
    hour < 19 ? 'evening rush' :
    hour < 23 ? 'late evening' : 'overnight';
  var dayPhrase = dow === 0 ? 'Sunday' : dow === 6 ? 'Saturday' : 'weekday';

  var trainCount = state.trains.length;
  var busCount = state.buses.length;
  var routeSet = {};
  state.buses.forEach(function(b) { if (b.route_id) routeSet[b.route_id] = true; });
  var routeCount = Object.keys(routeSet).length;

  var linesActive = {};
  state.trains.forEach(function(t) { linesActive[t.line] = (linesActive[t.line] || 0) + 1; });
  var busyLine = Object.keys(linesActive).sort(function(a, b) { return linesActive[b] - linesActive[a]; })[0];

  var arrivingNow = state.arrivals.filter(function(a) {
    var s = parseInt(a.WAITING_SECONDS, 10);
    return Number.isFinite(s) && s <= 60;
  }).length;

  var text = '';
  var sub = '';

  if (!trainCount && !busCount) {
    text = '<span class="hl">Signals quiet.</span> The network isn\'t reporting active vehicles right now \u2014 this is normal late at night or during a feed hiccup.';
    sub = 'Checked at ' + now.toLocaleTimeString();
  } else {
    var parts = [];
    parts.push('It\'s <span class="hl">' + timePhrase + '</span> on a ' + dayPhrase + ' in Atlanta.');
    if (busCount > 0) {
      parts.push('<span class="hl">' + busCount + '</span> buses are in motion across <span class="hl">' + routeCount + '</span> routes');
    }
    if (trainCount > 0) {
      var lineName = busyLine ? toTitleCase(busyLine) : '';
      parts.push('while <span class="hl">' + trainCount + '</span> trains thread the rail spine' + (lineName ? ', led by the <span class="hl">' + lineName + ' line</span>' : '') + '.');
    } else if (busCount > 0) {
      parts[parts.length - 1] += '.';
    }
    if (arrivingNow > 0) {
      parts.push('<span class="hl">' + arrivingNow + '</span> ' + (arrivingNow === 1 ? 'train is' : 'trains are') + ' pulling in within a minute.');
    }
    text = parts.join(' ');
    sub = 'Refreshed ' + now.toLocaleTimeString() + ' \u00b7 next update in 30s';
  }

  document.getElementById('narrative-text').innerHTML = text;
  document.getElementById('narrative-sub').textContent = sub;
  var tick = document.getElementById('narrative-tick');
  tick.textContent = '\u25cf';
  tick.style.color = 'var(--accent)';
  tick.animate(
    [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }],
    { duration: 900, iterations: 1 }
  );
}

var shapeCache = {};

function closeAllPopups() {
  var popups = document.querySelectorAll('.maplibregl-popup');
  for (var i = 0; i < popups.length; i++) popups[i].remove();
}

function onBusClick(feature, lngLat) {
  clearSelectedRoute();
  closeAllPopups();

  var routeId = feature.properties.route_id;
  var vehicleId = feature.properties.vehicle_id;
  var friendly = friendlyRouteName(routeId);
  var staticId = resolveRouteId(routeId);
  var coords = lngLat || feature.geometry.coordinates;

  var popup = new maplibregl.Popup({ closeButton: true, offset: 12 })
    .setLngLat(coords)
    .setHTML(
      '<div class="popup-title">' + escapeHtml(friendly || '\u2014') + '</div>' +
      '<div class="popup-row">Vehicle <b>' + escapeHtml(vehicleId || '\u2014') + '</b></div>' +
      '<div class="popup-row">' + (staticId ? 'Loading route shape\u2026' : 'No shape data for this route') + '</div>'
    )
    .addTo(map);

  if (!staticId) { return; }

  // Fetch and draw shape
  var url = '/.netlify/functions/gtfs-static?file=shape-for-route&route=' + encodeURIComponent(staticId);
  fetch(url)
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(geo) {
      if (!geo || !geo.features || !geo.features.length) {
        return;
      }
      var clean = { type: 'FeatureCollection', features: geo.features };
      var src = map.getSource('selected-route');
      if (src) {
        src.setData(clean);
        fitToRoute(clean);
      }
      try {
        popup.setHTML(
          '<div class="popup-title">' + escapeHtml(friendly || '\u2014') + '</div>' +
          '<div class="popup-row">Vehicle <b>' + escapeHtml(vehicleId || '\u2014') + '</b></div>' +
          '<div class="popup-row">Route shape drawn on map.</div>'
        );
      } catch(e) {}
    })
    .catch(function(err) { console.warn('BUS_CLICK: shape load failed', err); });
}

function onTrainClick(feature, lngLat) {
  closeAllPopups();
  var p = feature.properties;
  var coords = lngLat || feature.geometry.coordinates;
  new maplibregl.Popup({ closeButton: true, offset: 12 })
    .setLngLat(coords)
    .setHTML(
      '<div class="popup-title" style="color:' + (LINE_COLORS[p.line] || '#fff') + '">' + escapeHtml(p.line) + ' Line \u00b7 Train ' + escapeHtml(p.train_id || '') + '</div>' +
      '<div class="popup-row">Heading ' + escapeHtml(p.direction || '') + ' to <b>' + escapeHtml(p.destination || '') + '</b></div>' +
      '<div class="popup-row">Next stop <b>' + escapeHtml(p.next_station || '') + '</b> \u00b7 ' + escapeHtml(p.waiting_time || '') + '</div>'
    )
    .addTo(map);
}

function showRouteShape(routeId) {
  state.selectedRouteId = routeId;
  if (shapeCache[routeId]) {
    var src = map.getSource('selected-route');
    if (src) {
      src.setData(shapeCache[routeId]);
      fitToRoute(shapeCache[routeId]);
    }
    return Promise.resolve();
  }
  return fetch('/.netlify/functions/gtfs-static?file=shape-for-route&route=' + encodeURIComponent(routeId))
    .then(function(res) { return res.ok ? res.json() : null; })
    .then(function(geo) {
      if (!geo || !geo.features || !geo.features.length) return;
      // Strip non-standard 'properties' from FeatureCollection — MapLibre rejects it
      var clean = { type: 'FeatureCollection', features: geo.features };
      shapeCache[routeId] = clean;
      var src = map.getSource('selected-route');
      if (src) {
        src.setData(clean);
        fitToRoute(clean);
      }
    })
    .catch(function(err) { console.warn('shape load failed', err); });
}

function fitToRoute(geo) {
  // Calculate bounding box of all coordinates in the route
  var minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  for (var i = 0; i < geo.features.length; i++) {
    var coords = geo.features[i].geometry.coordinates;
    for (var j = 0; j < coords.length; j++) {
      var lng = coords[j][0];
      var lat = coords[j][1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
    padding: { top: 80, bottom: 80, left: 80, right: 420 },
    maxZoom: 14,
    duration: 800
  });
}

function clearSelectedRoute() {
  state.selectedRouteId = null;
  var src = map.getSource('selected-route');
  if (src) src.setData({ type: 'FeatureCollection', features: [] });
}

function startCountdown() {
  var ring = document.getElementById('ring-fg');
  var RING_CIRC = 97.39;
  var label = document.getElementById('countdown');

  setInterval(function() {
    var elapsed = Date.now() - state.tickStart;
    var remaining = Math.max(0, REFRESH_MS - elapsed);
    var secs = Math.ceil(remaining / 1000);
    label.textContent = secs;
    var frac = remaining / REFRESH_MS;
    ring.setAttribute('stroke-dashoffset', (RING_CIRC * (1 - frac)).toFixed(2));
    if (remaining <= 0) refreshAll();
  }, 250);
}

function escapeHtml(s) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(s)));
  return div.innerHTML;
}

function toTitleCase(s) { return String(s).charAt(0) + String(s).slice(1).toLowerCase(); }

function compactNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(Math.round(n));
}
