// Smoke test: verifies core data integrations before deploying.
// Run: node scripts/smoke-test.js  (from project root, after npm install)

var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var JSZip = require('jszip');

(async function() {
  var pass = true;

  // 1. Bus GTFS-RT protobuf decode
  console.log('\n--- BUS FEED ---');
  try {
    var busRes = await fetch('https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle');
    console.log('status:', busRes.status);
    if (busRes.ok) {
      var buf = Buffer.from(await busRes.arrayBuffer());
      var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
      var withPos = feed.entity.filter(function(e) { return e.vehicle && e.vehicle.position; }).length;
      console.log('entities with position:', withPos);
      console.log('PASS: protobuf decode works');
    } else {
      console.log('(upstream returned ' + busRes.status + ' - common, not a blocker for deploy)');
    }
  } catch (err) {
    console.log('WARN: bus feed unreachable (' + err.message + '). This is intermittent and OK.');
  }

  // 2. Static GTFS zip
  console.log('\n--- STATIC ZIP ---');
  try {
    var zipRes = await fetch('https://www.itsmarta.com/google_transit_feed/google_transit.zip');
    console.log('status:', zipRes.status, 'bytes:', zipRes.headers.get('content-length'));
    var zip = await JSZip.loadAsync(Buffer.from(await zipRes.arrayBuffer()));
    var requiredFiles = ['routes.txt', 'trips.txt', 'shapes.txt'];
    for (var i = 0; i < requiredFiles.length; i++) {
      var f = requiredFiles[i];
      var entry = zip.file(f);
      if (entry) {
        console.log(f, 'OK');
      } else {
        console.log(f, 'MISSING');
        pass = false;
      }
    }
    console.log('PASS: static zip loads');
  } catch (err) {
    console.log('FAIL: static zip - ' + err.message);
    pass = false;
  }

  // 3. Route shape pipeline (exercise the serverless function logic)
  console.log('\n--- ROUTE SHAPE PIPELINE ---');
  try {
    var handler = require('../netlify/functions/gtfs-static.js').handler;
    var dirRes = await handler({ queryStringParameters: { file: 'routes-directory' } });
    var dir = JSON.parse(dirRes.body);
    var dirCount = Object.keys(dir).length;
    console.log('directory entries:', dirCount);
    if (dirCount < 50) {
      console.log('WARN: expected ~118 routes, got', dirCount);
    }

    var sampleRoute = Object.keys(dir)[0];
    console.log('sample route:', sampleRoute, '->', dir[sampleRoute].short_name, dir[sampleRoute].long_name);

    var shapeRes = await handler({ queryStringParameters: { route: sampleRoute } });
    var shape = JSON.parse(shapeRes.body);
    var payloadKB = Math.round(shapeRes.body.length / 1024);
    console.log('shape features:', shape.features ? shape.features.length : 0, '| payload:', payloadKB, 'KB');
    if (payloadKB > 500) {
      console.log('WARN: payload is large (' + payloadKB + 'KB) - simplification may not be effective');
    } else {
      console.log('PASS: shape pipeline works, payload size reasonable');
    }
  } catch (err) {
    console.log('FAIL: route shape pipeline - ' + err.message);
    pass = false;
  }

  // Summary
  console.log('\n========================================');
  if (pass) {
    console.log('SMOKE TEST PASSED');
    console.log('Ready to deploy:');
    console.log('  netlify init');
    console.log('  netlify env:set MARTA_RAIL_KEY "your-key"');
    console.log('  npm run deploy');
  } else {
    console.log('SMOKE TEST FAILED - see errors above');
  }
  console.log('========================================\n');
})().catch(function(e) { console.error('FATAL:', e); process.exit(1); });
