import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 20 },  // Steady state at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete within 1.5s
    http_req_failed: ['rate<0.1'],     // Failure rate below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Chat API validation check (safe mocked test - does not trigger real AI spend)
  const payload = JSON.stringify({
    messages: [{ role: 'user', content: 'Ping test' }],
    model: 'qwen/qwen3.8-27b',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': `192.168.1.${Math.floor(Math.random() * 250) + 1}`,
    },
  };

  const chatRes = http.post(`${BASE_URL}/api/chat`, payload, params);
  check(chatRes, {
    'chat returns 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  sleep(1);
}

