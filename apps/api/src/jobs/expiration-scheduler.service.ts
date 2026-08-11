import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import { EXPIRE_LINKS_JOB, MAINTENANCE_QUEUE } from "./jobs.constants";

const DEFAULT_INTERVAL_MINUTES = 5;

@Injectable()
export class ExpirationSchedulerService {
  constructor(
    @InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async ensureScheduled(): Promise<void> {
    const intervalMinutes = this.config.get<number>(
      "LINK_EXPIRATION_CHECK_INTERVAL_MINUTES",
      DEFAULT_INTERVAL_MINUTES,
    );

    const existing = await this.queue.getRepeatableJobs();
    await Promise.all(
      existing
        .filter((job) => job.name === EXPIRE_LINKS_JOB)
        .map((job) => this.queue.removeRepeatableByKey(job.key)),
    );

    await this.queue.add(EXPIRE_LINKS_JOB, {}, { repeat: { every: intervalMinutes * 60 * 1000 } });
  }
}
