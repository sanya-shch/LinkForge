import { InjectQueue } from "@nestjs/bullmq";
import { Controller, Get, Header } from "@nestjs/common";
import type { Queue } from "bullmq";
import { CLICKS_QUEUE } from "../analytics/analytics.constants";
import { LinksCacheService } from "../cache/links-cache.service";
import { MAINTENANCE_QUEUE } from "../jobs/jobs.constants";
import { MetricsService } from "./metrics.service";

const QUEUE_STATES = ["waiting", "active", "delayed", "failed"] as const;

@Controller("metrics")
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly cache: LinksCacheService,
    @InjectQueue(CLICKS_QUEUE) private readonly clicksQueue: Queue,
    @InjectQueue(MAINTENANCE_QUEUE) private readonly maintenanceQueue: Queue,
  ) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async getMetrics(): Promise<string> {
    const [cacheMetrics, clicksCounts, maintenanceCounts] = await Promise.all([
      this.cache.getMetrics(),
      this.clicksQueue.getJobCounts(...QUEUE_STATES),
      this.maintenanceQueue.getJobCounts(...QUEUE_STATES),
    ]);

    this.metrics.redirectCacheHits.set(cacheMetrics.hits);
    this.metrics.redirectCacheMisses.set(cacheMetrics.misses);
    this.setQueueGauges("clicks", clicksCounts);
    this.setQueueGauges("maintenance", maintenanceCounts);

    return this.metrics.registry.metrics();
  }

  private setQueueGauges(
    queueName: "clicks" | "maintenance",
    counts: Record<string, number>,
  ): void {
    for (const state of QUEUE_STATES) {
      this.metrics.queueJobs.set({ queue: queueName, state }, counts[state] ?? 0);
    }
  }
}
