// Proxies MARTA's rail real-time arrivals JSON API.
// API key is held server-side in MARTA_RAIL_KEY env var — never exposed to the browser.

const BASE = 'https://developerservices.itsmarta.com:18096/itsmarta/railrealtimearrivals/developerservices/traindata';

let cache = { ts: 0, payload: null };
const CACHE_MS = 10000;

exports.handler = async () => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=10',
    'Content-Type': 'application/json',
  };

  const key = process.env.MARTA_RAIL_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'missing_key',
        message: 'Set MARTA_RAIL_KEY in Netlify environment variables.',
      }),
    };
  }

  const now = Date.now();
  if (cache.payload && now - cache.ts < CACHE_MS) {
    return { statusCode: 200, headers: { ...cors, 'X-Cache': 'HIT' }, body: cache.payload };
  }

  try {
    const url = BASE + '?apiKey=' + encodeURIComponent(key);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'marta-transit-intelligence/1.0 (+generoth.com)' },
    });
    if (!res.ok) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'upstream', status: res.status }) };
    }
    const rows = await res.json();

    // Each train appears once per upcoming station. Dedupe to one record per TRAIN_ID
    // using the nearest upcoming arrival as the representative row.
    const trains = new Map();
    const arrivals = [];
    for (const r of rows) {
      arrivals.push(r);
      const id = r.TRAIN_ID;
      if (!id) continue;
      const lat = parseFloat(r.LATITUDE);
      const lon = parseFloat(r.LONGITUDE);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const waiting = parseInt(r.WAITING_SECONDS, 10);
      const existing = trains.get(id);
      if (!existing || (Number.isFinite(waiting) && waiting < existing._waiting)) {
        trains.set(id, {
          train_id: id,
          line: r.LINE,
          direction: r.DIRECTION,
          destination: r.DESTINATION,
          next_station: r.STATION,
          next_arrival: r.NEXT_ARR,
          waiting_time: r.WAITING_TIME,
          waiting_seconds: waiting,
          lat: lat,
          lon: lon,
          event_time: r.EVENT_TIME,
          _waiting: Number.isFinite(waiting) ? waiting : 9999,
        });
      }
    }

    const payload = JSON.stringify({
      fetched_at: new Date().toISOString(),
      train_count: trains.size,
      trains: Array.from(trains.values()).map(function(t) {
        var copy = Object.assign({}, t);
        delete copy._waiting;
        return copy;
      }),
      arrivals: arrivals,
    });

    cache = { ts: now, payload: payload };
    return { statusCode: 200, headers: { ...cors, 'X-Cache': 'MISS' }, body: payload };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'proxy_failure', message: String(err?.message || err) }),
    };
  }
};
