import { beforeEach, describe, expect, it } from "vitest";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it("exposes registered metrics in Prometheus text format", async () => {
    const text = await service.registry.metrics();

    expect(text).toContain("linkforge_rate_limit_rejections_total");
    expect(text).toContain("linkforge_redirect_cache_hits_total");
    expect(text).toContain("linkforge_redirect_cache_misses_total");
    expect(text).toContain("linkforge_queue_jobs");
  });

  it("increments the rate limit rejection counter with the correct guard label", async () => {
    service.recordRateLimitRejection("create_link");
    service.recordRateLimitRejection("create_link");
    service.recordRateLimitRejection("redirect");

    const text = await service.registry.metrics();

    expect(text).toContain('linkforge_rate_limit_rejections_total{guard="create_link"} 2');
    expect(text).toContain('linkforge_rate_limit_rejections_total{guard="redirect"} 1');
  });

  it("includes default Node.js process metrics under the linkforge_ prefix", async () => {
    const text = await service.registry.metrics();

    expect(text).toMatch(/linkforge_process_cpu_/);
  });
});
