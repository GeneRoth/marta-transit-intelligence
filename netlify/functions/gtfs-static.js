// Serves precomputed GeoJSON + metadata from MARTA's static GTFS zip (~20MB).
// Zip is fetched once and held in warm-instance memory for 6h.
// Shapes are Douglas-Peucker simplified (~5m tolerance) before serving.
// Endpoints:
//   /api/gtfs/routes-directory       -> { route_id: {short_name, long_name, color}, ... }
//   /api/gtfs/shape-for-route?route=ID -> simplified GeoJSON for one route
//   /api/gtfs/<file>.txt             -> raw CSV passthrough

var JSZip = require('jszip');

// NOTE (Apr 18, 2026): MARTA's Azure Application Gateway appears to filter some requests —
// curl and browsers work, but Netlify Functions (AWS us-east-1) intermittently get 500s.
// Defenses below: (1) browser-style User-Agent, (2) explicit redirect: 'follow',
// (3) try April18 URL first, fall back to main URL on failure, (4) one retry with delay.
var ZIP_URLS = [
  'https://itsmarta.com/google_transit_feed/April18_2026_google_transit.zip',
  'https://itsmarta.com/google_transit_feed/google_transit.zip',
];
var ZIP_CACHE_MS = 6 * 60 * 60 * 1000;

var zipCache = { ts: 0, zip: null };

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function fetchZipOnce(url) {
  var res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/zip, application/octet-stream, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' from ' + url);
  return Buffer.from(await res.arrayBuffer());
}

async function getZip() {
  var now = Date.now();
  if (zipCache.zip && now - zipCache.ts < ZIP_CACHE_MS) return zipCache.zip;

  var lastErr = null;
  for (var attempt = 0; attempt < 2; attempt++) {
    for (var i = 0; i < ZIP_URLS.length; i++) {
      try {
        var buf = await fetchZipOnce(ZIP_URLS[i]);
        var zip = await JSZip.loadAsync(buf);
        zipCache = { ts: now, zip: zip };
        return zip;
      } catch (err) {
        lastErr = err;
      }
    }
    // All URLs failed on this pass; back off briefly before retry
    if (attempt === 0) await sleep(500);
  }
  throw new Error('zip fetch failed after retries: ' + (lastErr && lastErr.message));
}

var ALLOWED = new Set([
  'routes.txt',
  'shapes.txt',
  'trips.txt',
  'stops.txt',
  'agency.txt',
  'calendar.txt',
]);

var routeShapeCache = new Map();
var parsedAll = null;
var parseInFlight = null;

async function parseAllRoutes() {
  if (parsedAll) return parsedAll;
  if (parseInFlight) return parseInFlight;
  parseInFlight = (async function() {
    var zip = await getZip();
    var tripsTxt = await zip.file('trips.txt').async('string');
    var shapesTxt = await zip.file('shapes.txt').async('string');
    var routesTxt = await zip.file('routes.txt').async('string');

    // Route metadata
    var routeMeta = new Map();
    var rLines = routesTxt.split(/\r?\n/);
    var rHeader = rLines[0].split(',');
    var riId = rHeader.indexOf('route_id');
    var riShort = rHeader.indexOf('route_short_name');
    var riLong = rHeader.indexOf('route_long_name');
    var riColor = rHeader.indexOf('route_color');
    for (var ri = 1; ri < rLines.length; ri++) {
      var rRow = rLines[ri];
      if (!rRow) continue;
      var rf = splitCsvRow(rRow);
      var rid = rf[riId];
      if (!rid) continue;
      routeMeta.set(rid, {
        short_name: rf[riShort] || '',
        long_name: rf[riLong] || '',
        color: rf[riColor] || '',
      });
    }

    // shape_id -> sorted [[lon, lat], ...]
    var shapes = new Map();
    var sLines = shapesTxt.split(/\r?\n/);
    var sHeader = sLines[0].split(',');
    var siId = sHeader.indexOf('shape_id');
    var siLat = sHeader.indexOf('shape_pt_lat');
    var siLon = sHeader.indexOf('shape_pt_lon');
    var siSeq = sHeader.indexOf('shape_pt_sequence');
    for (var si = 1; si < sLines.length; si++) {
      var sRow = sLines[si];
      if (!sRow) continue;
      var sf = sRow.split(',');
      var sid = sf[siId];
      if (!sid) continue;
      var slat = parseFloat(sf[siLat]);
      var slon = parseFloat(sf[siLon]);
      var sseq = parseInt(sf[siSeq], 10);
      if (!Number.isFinite(slat) || !Number.isFinite(slon)) continue;
      if (!shapes.has(sid)) shapes.set(sid, []);
      shapes.get(sid).push([slon, slat, sseq]);
    }
    for (var pts of shapes.values()) pts.sort(function(a, b) { return a[2] - b[2]; });

    // route_id -> Set of shape_ids
    var routeToShapes = new Map();
    var tLines = tripsTxt.split(/\r?\n/);
    var tHeader = tLines[0].split(',');
    var tiRoute = tHeader.indexOf('route_id');
    var tiShape = tHeader.indexOf('shape_id');
    for (var ti = 1; ti < tLines.length; ti++) {
      var tRow = tLines[ti];
      if (!tRow) continue;
      var tf = tRow.split(',');
      var tr = tf[tiRoute];
      var ts = tf[tiShape];
      if (!tr || !ts) continue;
      if (!routeToShapes.has(tr)) routeToShapes.set(tr, new Set());
      routeToShapes.get(tr).add(ts);
    }

    // Simplified, deduped GeoJSON per route
    var out = new Map();
    for (var entry of routeToShapes) {
      var routeId = entry[0];
      var shapeIds = entry[1];
      var features = [];
      var seen = new Set();
      for (var shapeId of shapeIds) {
        var rawPts = shapes.get(shapeId);
        if (!rawPts || rawPts.length < 2) continue;
        var coords = rawPts.map(function(p) { return [p[0], p[1]]; });
        var simplified = simplifyLine(coords, 0.00005);
        var fp = fingerprint(simplified);
        if (seen.has(fp)) continue;
        seen.add(fp);
        features.push({
          type: 'Feature',
          properties: { shape_id: shapeId },
          geometry: { type: 'LineString', coordinates: simplified },
        });
      }
      if (features.length) {
        var meta = routeMeta.get(routeId) || {};
        out.set(routeId, {
          type: 'FeatureCollection',
          properties: {
            route_id: routeId,
            short_name: meta.short_name || '',
            long_name: meta.long_name || '',
            color: meta.color || '',
          },
          features: features,
        });
      }
    }

    var directory = {};
    for (var mEntry of routeMeta) {
      directory[mEntry[0]] = mEntry[1];
    }
    out.set('__directory__', directory);

    parsedAll = out;
    parseInFlight = null;
    return out;
  })();
  return parseInFlight;
}

function splitCsvRow(row) {
  var out = [];
  var cur = '';
  var inQ = false;
  for (var i = 0; i < row.length; i++) {
    var c = row[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function simplifyLine(points, tol) {
  if (points.length < 3) return points;
  var keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  var stack = [[0, points.length - 1]];
  while (stack.length) {
    var pair = stack.pop();
    var lo = pair[0];
    var hi = pair[1];
    var maxD = 0;
    var idx = -1;
    var x1 = points[lo][0];
    var y1 = points[lo][1];
    var x2 = points[hi][0];
    var y2 = points[hi][1];
    for (var i = lo + 1; i < hi; i++) {
      var d = perpDist(points[i], x1, y1, x2, y2);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx !== -1 && maxD > tol) {
      keep[idx] = 1;
      stack.push([lo, idx]);
      stack.push([idx, hi]);
    }
  }
  var out = [];
  for (var j = 0; j < points.length; j++) {
    if (keep[j]) out.push(points[j]);
  }
  return out;
}

function perpDist(p, x1, y1, x2, y2) {
  var x = p[0];
  var y = p[1];
  var dx = x2 - x1;
  var dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  var t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  var tc = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + tc * dx), y - (y1 + tc * dy));
}

function fingerprint(coords) {
  if (!coords.length) return '';
  var a = coords[0];
  var b = coords[Math.floor(coords.length / 2)];
  var c = coords[coords.length - 1];
  var r = function(n) { return n.toFixed(4); };
  return r(a[0]) + ',' + r(a[1]) + '|' + r(b[0]) + ',' + r(b[1]) + '|' + r(c[0]) + ',' + r(c[1]) + '|' + coords.length;
}

exports.handler = async function(event) {
  var cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  // Never cache error responses — prevents the CDN from storing transient MARTA failures
  // and serving them for hours afterward. Success paths set their own Cache-Control explicitly.
  var noCache = { 'Cache-Control': 'no-store, max-age=0' };

  var file = (event.queryStringParameters && event.queryStringParameters.file) || '';
  var route = event.queryStringParameters && event.queryStringParameters.route;

  if (file === 'routes-directory') {
    try {
      var all1 = await parseAllRoutes();
      var dir = all1.get('__directory__') || {};
      return {
        statusCode: 200,
        headers: { ...cors, 'Cache-Control': 'public, max-age=21600' },
        body: JSON.stringify(dir),
      };
    } catch (err) {
      return { statusCode: 500, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'parse_failure', message: String(err && err.message || err) }) };
    }
  }

  if (file === 'shape-for-route' || route) {
    var routeId = route || (event.queryStringParameters && event.queryStringParameters.route_id);
    if (!routeId) {
      return { statusCode: 400, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'missing_route', hint: 'pass ?route=ROUTE_ID' }) };
    }
    if (routeShapeCache.has(routeId)) {
      return { statusCode: 200, headers: { ...cors, 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'HIT' }, body: routeShapeCache.get(routeId) };
    }
    try {
      var all2 = await parseAllRoutes();
      var geo = all2.get(routeId) || { type: 'FeatureCollection', features: [] };
      var body = JSON.stringify(geo);
      routeShapeCache.set(routeId, body);
      return { statusCode: 200, headers: { ...cors, 'Cache-Control': 'public, max-age=3600', 'X-Cache': 'MISS' }, body: body };
    } catch (err) {
      return { statusCode: 500, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'parse_failure', message: String(err && err.message || err) }) };
    }
  }

  if (!ALLOWED.has(file)) {
    return { statusCode: 400, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'bad_file', allowed: Array.from(ALLOWED) }) };
  }

  try {
    var zip = await getZip();
    var entry = zip.file(file);
    if (!entry) {
      return { statusCode: 404, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'not_in_zip', file: file }) };
    }
    var text = await entry.async('string');
    return { statusCode: 200, headers: { ...cors, 'Cache-Control': 'public, max-age=3600', 'Content-Type': 'text/csv; charset=utf-8' }, body: text };
  } catch (err) {
    return { statusCode: 500, headers: { ...cors, ...noCache }, body: JSON.stringify({ error: 'proxy_failure', message: String(err && err.message || err) }) };
  }
};
