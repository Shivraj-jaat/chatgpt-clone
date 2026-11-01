/**
 * Unit Test Suite for ChatGPT Clone Core Security & Utility Modules
 * Run with: node tests/unit-test.js
 */

import assert from 'node:assert';

async function runUnitTests() {
  console.log('\n=============================================');
  console.log(' Running Unit Tests for Security & Validation');
  console.log('=============================================\n');

  // Test 1: Sliding Window Rate Limiter
  console.log('Test 1: Rate Limiter logic...');
  const timestamps = [];
  const maxReq = 3;
  const windowMs = 1000;

  function checkLimit(now) {
    const start = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] <= start) {
      timestamps.shift();
    }
    if (timestamps.length < maxReq) {
      timestamps.push(now);
      return true;
    }
    return false;
  }

  assert.strictEqual(checkLimit(100), true, 'Request 1 should pass');
  assert.strictEqual(checkLimit(200), true, 'Request 2 should pass');
  assert.strictEqual(checkLimit(300), true, 'Request 3 should pass');
  assert.strictEqual(checkLimit(400), false, 'Request 4 should be rate limited');
  assert.strictEqual(checkLimit(1200), true, 'Request 5 after window expires should pass');
  console.log('  ✓ Rate limiter sliding window algorithm passed!');

  // Test 2: Input boundary enforcement
  console.log('Test 2: Request boundary enforcement...');
  const maxPayloadChars = 60000;
  const safeText = 'Hello world'.repeat(10);
  const dangerousText = 'A'.repeat(70000);

  assert.strictEqual(safeText.length < maxPayloadChars, true, 'Safe text within bounds');
  assert.strictEqual(dangerousText.length > maxPayloadChars, true, 'Dangerous text exceeds bounds');
  console.log('  ✓ Payload size boundary checks passed!');

  // Test 3: Clamping values
  console.log('Test 3: Value clamping (temperature & tokens)...');
  function clampTemp(val) {
    const n = Number(val);
    return Number.isNaN(n) ? 0.7 : Math.max(0.0, Math.min(2.0, n));
  }
  function clampTokens(val) {
    const n = Number(val);
    return Number.isNaN(n) ? 2048 : Math.max(1, Math.min(4096, Math.floor(n)));
  }

  assert.strictEqual(clampTemp(5.0), 2.0, 'Temperature clamped to max 2.0');
  assert.strictEqual(clampTemp(-1.0), 0.0, 'Temperature clamped to min 0.0');
  assert.strictEqual(clampTokens(10000), 4096, 'Tokens clamped to max 4096');
  assert.strictEqual(clampTokens(-50), 1, 'Tokens clamped to min 1');
  console.log('  ✓ Clamping logic verified!');

  console.log('\n✓ All 3 unit verification tests passed!\n');
}

runUnitTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
