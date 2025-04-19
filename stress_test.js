// k6 script to test the FastAPI application (main.py)

import http from 'k6/http';
import { check, sleep, group } from 'k6';

// --- Test Configuration ---
export const options = {
  vus: 2000, // Number of virtual users to simulate
  duration: '30s', // Duration of the test
  thresholds: {
    // Define pass/fail criteria
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

// --- Base URL of the API ---
const BASE_URL = 'http://localhost:5060'; // !!! ADJUST IF NEEDED !!!

// --- Main Test Logic ---
export default function () {
  group('Root Endpoint', function () {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'GET / status is 200': (r) => r.status === 200,
      'GET / body contains welcome message': (r) => r.body.includes('Welcome'),
    });
    sleep(1); // Simulate think time
  });

  group('Status Endpoint', function () {
    const res = http.get(`${BASE_URL}/status`);
    check(res, {
      'GET /status status is 200': (r) => r.status === 200,
      'GET /status body shows healthy': (r) => r.body.includes('healthy'),
    });
    sleep(1);
  });

   group('Metrics Endpoint', function () {
    const res = http.get(`${BASE_URL}/metrics`);
    check(res, {
      'GET /metrics status is 200': (r) => r.status === 200,
      'GET /metrics body contains http_requests': (r) => r.body.includes('http_requests_total'),
    });
    sleep(1);
  });

  group('Get Items Endpoint', function () {
    // Test fetching existing items
    const itemIds = [1, 2, 3]; // IDs known to exist
    for (const id of itemIds) {
      const res = http.get(`${BASE_URL}/items/${id}`);
      check(res, {
        [`GET /items/${id} status is 200`]: (r) => r.status === 200,
        [`GET /items/${id} returns correct ID`]: (r) => r.json('item_id') === id,
      });
      sleep(0.5);
    }

    // Test fetching a non-existent item
    const nonExistentId = 999;
    const resNotFound = http.get(`${BASE_URL}/items/${nonExistentId}`);
    check(resNotFound, {
      [`GET /items/${nonExistentId} status is 404`]: (r) => r.status === 404,
    });
    sleep(1);
  });

  group('Search Items Endpoint', function () {
    // Search without parameters
    let res = http.get(`${BASE_URL}/search/`);
    check(res, { 'GET /search/ (no params) status is 200': (r) => r.status === 200 });
    sleep(0.5);

    // Search by name
    res = http.get(`${BASE_URL}/search/?name=lap`);
    check(res, { 'GET /search/?name=lap status is 200': (r) => r.status === 200 });
    sleep(0.5);

    // Search by min_price
    res = http.get(`${BASE_URL}/search/?min_price=50`);
    check(res, { 'GET /search/?min_price=50 status is 200': (r) => r.status === 200 });
    sleep(0.5);

    // Search by name and min_price
    res = http.get(`${BASE_URL}/search/?name=key&min_price=70`);
    check(res, { 'GET /search/?name=key&min_price=70 status is 200': (r) => r.status === 200 });
    sleep(1);
  });

  group('Create Item Endpoint', function () {
    const payload = JSON.stringify({
      name: `k6_item_${__VU}_${__ITER}`, // Unique name per VU/iteration
      price: Math.random() * 100, // Random price
      is_offer: Math.random() < 0.5, // Randomly true/false
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/items/`, payload, params);
    check(res, {
      'POST /items/ status is 200': (r) => r.status === 200,
      'POST /items/ body contains success message': (r) => r.body.includes('Item created successfully'),
    });
    sleep(1);
  });
}