import { Injectable } from "@nestjs/common";
import { Counter, Gauge, Registry, collectDefaultMetrics } from "prom-client";

export type RateLimitGuardName = "create_link" | "redirect";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly rateLimitRejections = new Counter({
    name: "linkforge_rate_limit_rejections_total",
    help: "Number of requests rejected by a rate limit guard",
    labelNames: ["guard"] as const,
    registers: [this.registry],
  });

  readonly redirectCacheHits = new Gauge({
    name: "linkforge_redirect_cache_hits_total",
    help: "Total redirect cache hits (mirrored from Redis, shared across instances)",
    registers: [this.registry],
  });

  readonly redirectCacheMisses = new Gauge({
    name: "linkforge_redirect_cache_misses_total",
    help: "Total redirect cache misses (mirrored from Redis, shared across instances)",
    registers: [this.registry],
  });

  readonly queueJobs = new Gauge({
    name: "linkforge_queue_jobs",
    help: "Current BullMQ job counts per queue and state",
    labelNames: ["queue", "state"] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "linkforge_" });
  }

  recordRateLimitRejection(guard: RateLimitGuardName): void {
    this.rateLimitRejections.inc({ guard });
  }
}
