import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
import type { LinksCacheService } from "../cache/links-cache.service";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

function makeQueueMock(counts: Record<string, number>) {
  return { getJobCounts: vi.fn().mockResolvedValue(counts) };
}

describe("MetricsController", () => {
  let metrics: MetricsService;
  let cache: { getMetrics: ReturnType<typeof vi.fn> };
  let clicksQueue: { getJobCounts: ReturnType<typeof vi.fn> };
  let maintenanceQueue: { getJobCounts: ReturnType<typeof vi.fn> };
  let controller: MetricsController;

  beforeEach(() => {
    metrics = new MetricsService();
    cache = { getMetrics: vi.fn().mockResolvedValue({ hits: 42, misses: 7 }) };
    clicksQueue = makeQueueMock({ waiting: 3, active: 1, delayed: 0, failed: 2 });
    maintenanceQueue = makeQueueMock({ waiting: 0, active: 0, delayed: 1, failed: 0 });

    controller = new MetricsController(
      metrics,
      cache as unknown as LinksCacheService,
      clicksQueue as unknown as Queue,
      maintenanceQueue as unknown as Queue,
    );
  });

  it("returns Prometheus text containing the live cache hit/miss values", async () => {
    const text = await controller.getMetrics();

    expect(text).toContain("linkforge_redirect_cache_hits_total 42");
    expect(text).toContain("linkforge_redirect_cache_misses_total 7");
  });

  it("returns Prometheus text containing per-queue job counts by state", async () => {
    const text = await controller.getMetrics();

    expect(text).toContain('linkforge_queue_jobs{queue="clicks",state="waiting"} 3');
    expect(text).toContain('linkforge_queue_jobs{queue="clicks",state="failed"} 2');
    expect(text).toContain('linkforge_queue_jobs{queue="maintenance",state="delayed"} 1');
  });

  it("queries both queues for the same set of states", async () => {
    await controller.getMetrics();

    expect(clicksQueue.getJobCounts).toHaveBeenCalledWith("waiting", "active", "delayed", "failed");
    expect(maintenanceQueue.getJobCounts).toHaveBeenCalledWith(
      "waiting",
      "active",
      "delayed",
      "failed",
    );
  });
});
