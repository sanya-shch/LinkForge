import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Queue } from "bullmq";
import type { Request } from "express";
import { CLICKS_QUEUE } from "./analytics.constants";

export interface ClickJobData {
  linkId: string;
  timestamp: string;
  ip: string;
  userAgent: string;
}

@Injectable()
export class ClickTrackerService {
  private readonly logger = new Logger(ClickTrackerService.name);

  constructor(@InjectQueue(CLICKS_QUEUE) private readonly queue: Queue<ClickJobData>) {}

  async track(linkId: string, req: Request): Promise<void> {
    const data: ClickJobData = {
      linkId,
      timestamp: new Date().toISOString(),
      ip: req.ip ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "",
    };

    try {
      await this.queue.add("record-click", data, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (err) {
      this.logger.error(`Failed to enqueue click for link ${linkId}: ${(err as Error).message}`);
    }
  }
}
