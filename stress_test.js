import http from 'k6/http';
import { check, sleep } from 'k6';

// --- Test Configuration ---
export const options = {
  vus: 5000,
  duration: '4s',
  thresholds: {
    'http_req_failed{expected_error:false}': ['rate<0.01'],
    'http_req_duration{expected_error:false}': ['p(95)<500'],
  },
};

// --- Base URL ---
const BASE_URL = 'http://localhost:5060';

// --- Safe JSON parser ---
function safeJson(res) {
  try {
    if (
      res.status === 200 &&
      res.headers['Content-Type'] &&
      res.headers['Content-Type'].includes('application/json')
    ) {
      return res.json();
    }
  } catch (err) {
    console.error(`❌ JSON parse error for ${res.url}: ${err}`);
  }
  return null;
}

// --- Endpoints list ---
const endpoints = [
  {
    name: 'Root Endpoint',
    fn: () => {
      const res = http.get(`${BASE_URL}/`);
      check(res, {
        'GET / status is 200': (r) => r.status === 200,
        'GET / contains Welcome': (r) => r.body && r.body.includes('Welcome'),
      });
    },
  },
  {
    name: 'Status Endpoint',
    fn: () => {
      const res = http.get(`${BASE_URL}/status`);
      check(res, {
        'GET /status status is 200': (r) => r.status === 200,
        'GET /status healthy': (r) => r.body && r.body.includes('healthy'),
      });
    },
  },
  {
    name: 'Metrics Endpoint',
    fn: () => {
      const res = http.get(`${BASE_URL}/metrics`);
      check(res, {
        'GET /metrics status is 200': (r) => r.status === 200,
        'GET /metrics has http_requests_total': (r) =>
          r.body && r.body.includes('http_requests_total'),
      });
    },
  },
  {
    name: 'Get Items Endpoint',
    fn: () => {
      const itemIds = [1, 2, 3];
      for (const id of itemIds) {
        const res = http.get(`${BASE_URL}/items/${id}`);
        const json = safeJson(res);
        check(res, {
          [`GET /items/${id} status is 200`]: (r) => r.status === 200,
          [`GET /items/${id} correct ID`]: () =>
            json && json.item_id === id,
        });
      }
    },
  },
  {
    name: 'Search Items Endpoint',
    fn: () => {
      http.get(`${BASE_URL}/search/?name=lap`);
      http.get(`${BASE_URL}/search/?min_price=50`);
      http.get(`${BASE_URL}/search/?name=key&min_price=70`);
    },
  },
  {
    name: 'Create Item Endpoint',
    fn: () => {
      const payload = JSON.stringify({
        name: `k6_item_${__VU}_${__ITER}`,
        price: Math.random() * 100,
        is_offer: Math.random() < 0.5,
      });
      const params = { headers: { 'Content-Type': 'application/json' } };
      const res = http.post(`${BASE_URL}/items/`, payload, params);
      check(res, {
        'POST /items/ status is 200': (r) => r.status === 200,
        'POST /items/ success msg': (r) =>
          r.body && r.body.includes('Item created successfully'),
      });
    },
  },
  {
    name: 'Error 500 Endpoint',
    fn: () => {
      const res = http.get(`${BASE_URL}/error-500`, {
        tags: { expected_error: 'true' },
      });
      check(res, {
        'GET /error-500 status is 500': (r) => r.status === 500,
        'GET /error-500 contains Internal Server Error': (r) =>
          r.body && r.body.includes('Internal Server Error'),
      });
    },
  },
  {
    name: 'Error 400 Endpoint',
    fn: () => {
      const res = http.get(`${BASE_URL}/error-400`, {
        tags: { expected_error: 'true' },
      });
      check(res, {
        'GET /error-400 status is 400': (r) => r.status === 400,
        'GET /error-400 contains Bad Request': (r) =>
          r.body && r.body.includes('Bad Request'),
      });
    },
  },
];

// --- Main Test ---
export default function () {
  const choice = endpoints[Math.floor(Math.random() * endpoints.length)];
  try {
    choice.fn();
  } catch (err) {
    console.error(`❌ Error running test for ${choice.name}: ${err}`);
  }
  sleep(0.2);
}
