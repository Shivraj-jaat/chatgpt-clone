/**
 * Standalone Node.js Load Testing & Reliability Verification Script
 * Usage: node tests/load-test.js [baseUrl]
 */

import http from 'node:http';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const parsedUrl = new URL(BASE_URL);

function makeRequest({ path, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const payload = body ? JSON.stringify(body) : null;

    const reqHeaders = {
      ...headers,
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
    };

    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path,
        method,
        headers: reqHeaders,
        timeout: 10000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          const duration = Date.now() - startTime;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: raw,
            duration,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runSuite() {
  console.log(`\n======================================================`);
  console.log(` Starting Reliability & Load Verification against: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // Test 1: Health Check
  process.stdout.write('[Test 1] Health Endpoint Diagnostics... ');
  try {
    const health = await makeRequest({ path: '/api/health' });
    if (health.status === 200) {
      console.log(`PASSED (HTTP 200 in ${health.duration}ms)`);
    } else {
      console.log(`FAILED with status ${health.status}`);
    }
  } catch (err) {
    console.log(`FAILED (${err.message}) - Is dev server running on ${BASE_URL}?`);
  }

  // Test 2: Input Validation Rejection
  process.stdout.write('[Test 2] Input Validation (Empty / Malformed payload)... ');
  try {
    const malformed = await makeRequest({
      path: '/api/chat',
      method: 'POST',
      body: { invalid: 'payload' },
    });
    if (malformed.status === 400) {
      console.log(`PASSED (HTTP 400 correctly rejected malformed body in ${malformed.duration}ms)`);
    } else {
      console.log(`FAILED (Expected 400, got ${malformed.status})`);
    }
  } catch (err) {
    console.log(`FAILED (${err.message})`);
  }

  // Test 3: Excessive payload length safety threshold
  process.stdout.write('[Test 3] Payload DOS Protection (Exceeding safety threshold)... ');
  try {
    const hugeMsg = 'A'.repeat(70000);
    const hugeRes = await makeRequest({
      path: '/api/chat',
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: hugeMsg }],
      },
    });
    if (hugeRes.status === 400) {
      console.log(`PASSED (HTTP 400 blocked oversized payload)`);
    } else {
      console.log(`FAILED (Expected 400, got ${hugeRes.status})`);
    }
  } catch (err) {
    console.log(`FAILED (${err.message})`);
  }

  // Test 4: Rate Limiting & Concurrency Burst
  console.log('\n[Test 4] Rate Limiting Stress Burst (Firing 20 rapid requests)...');
  const burstResults = [];
  const startBurst = Date.now();

  const requests = Array.from({ length: 20 }).map((_, i) =>
    makeRequest({
      path: '/api/chat',
      method: 'POST',
      body: {
        messages: [{ role: 'user', content: `Ping test ${i}` }],
        model: 'invalid_model_test',
      },
    })
      .then((res) => burstResults.push(res))
      .catch((err) => burstResults.push({ status: 500, error: err.message, duration: 0 }))
  );

  await Promise.all(requests);
  const totalDuration = Date.now() - startBurst;

  const statusCounts = {};
  const latencies = [];
  burstResults.forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.duration) latencies.push(r.duration);
  });

  console.log(`  - Total Completed: ${burstResults.length} requests in ${totalDuration}ms`);
  console.log(`  - Status Breakdown:`, statusCounts);
  console.log(`  - Rate Limit (429) Triggered: ${Boolean(statusCounts[429]) ? 'YES (Protected against server exhaustion)' : 'NO'}`);
  console.log(`  - Latency: p50 = ${percentile(latencies, 50)}ms | p95 = ${percentile(latencies, 95)}ms | p99 = ${percentile(latencies, 99)}ms`);

  console.log(`\n======================================================`);
  console.log(` Test Suite Complete!`);
  console.log(`======================================================\n`);
}

runSuite().catch(console.error);
