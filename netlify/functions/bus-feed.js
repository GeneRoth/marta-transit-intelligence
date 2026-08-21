// Proxies MARTA's GTFS-RT vehicle positions (protobuf) and decodes to JSON.
// MARTA's endpoint doesn't send CORS headers, so we can't call it from the browser.

const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const FEED_URL = 'https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb';

let cache = { ts: 0, payload: null };
const CACHE_MS = 15000;

exports.handler = async () => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=15',
    'Content-Type': 'application/json',
  };

  const now = Date.now();
  if (cache.payload && now - cache.ts < CACHE_MS) {
    return { statusCode: 200, headers: { ...cors, 'X-Cache': 'HIT' }, body: cache.payload };
  }

  try {
    const res = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'marta-transit-intelligence/1.0 (+generoth.com)' },
    });
    if (!res.ok) {
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'upstream', status: res.status }) };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);

    const vehicles = [];
    for (const entity of feed.entity) {
      const v = entity.vehicle;
      if (!v || !v.position) continue;
      vehicles.push({
        id: entity.id,
        vehicle_id: v.vehicle?.id || null,
        label: v.vehicle?.label || null,
        route_id: v.trip?.routeId || null,
        trip_id: v.trip?.tripId || null,
        direction_id: v.trip?.directionId ?? null,
        lat: v.position.latitude,
        lon: v.position.longitude,
        bearing: v.position.bearing ?? null,
        speed: v.position.speed ?? null,
        timestamp: v.timestamp ? Number(v.timestamp) : null,
      });
    }

    const payload = JSON.stringify({
      feed_timestamp: feed.header?.timestamp ? Number(feed.header.timestamp) : null,
      count: vehicles.length,
      vehicles,
    });

    cache = { ts: now, payload };
    return { statusCode: 200, headers: { ...cors, 'X-Cache': 'MISS' }, body: payload };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'proxy_failure', message: String(err?.message || err) }),
    };
  }
};
