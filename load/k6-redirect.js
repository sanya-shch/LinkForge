import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const WARM_SLUG = __ENV.SLUG || "k6-warm";

const warmLatency = new Trend("warm_cache_redirect_ms");
const coldLatency = new Trend("cold_cache_redirect_ms");

export const options = {
  scenarios: {
    warm_cache: {
      executor: "constant-vus",
      vus: 20,
      duration: "30s",
      exec: "hitWarmSlug",
    },
    cold_cache: {
      executor: "per-vu-iterations",
      vus: 8,
      iterations: 1,
      startTime: "35s",
      exec: "hitColdSlug",
    },
  },
  thresholds: {
    warm_cache_redirect_ms: ["p(95)<100"],
  },
};

export function hitWarmSlug() {
  const res = http.get(`${BASE_URL}/${WARM_SLUG}`, { redirects: 0 });
  warmLatency.add(res.timings.duration);
  check(res, { "warm: status is 302 or 429": (r) => r.status === 302 || r.status === 429 });
  sleep(0.05);
}

export function hitColdSlug() {
  const alias = `k6-cold-${__VU}-${Date.now()}`;
  const createRes = http.post(
    `${BASE_URL}/links`,
    JSON.stringify({ originalUrl: "https://example.com", customAlias: alias }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (createRes.status !== 201) {
    return;
  }

  const res = http.get(`${BASE_URL}/${alias}`, { redirects: 0 });
  coldLatency.add(res.timings.duration);
  check(res, { "cold: status is 302": (r) => r.status === 302 });
}
