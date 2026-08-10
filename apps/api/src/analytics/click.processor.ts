import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";
import { PrismaService } from "../prisma/prisma.service";
import { CLICKS_QUEUE } from "./analytics.constants";
import { isBotUserAgent } from "./bot-detector";
import type { ClickJobData } from "./click-tracker.service";

@Processor(CLICKS_QUEUE)
export class ClickProcessor extends WorkerHost {
  private readonly logger = new Logger(ClickProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ClickJobData>): Promise<void> {
    const { linkId, timestamp, ip, userAgent } = job.data;

    try {
      const isBot = isBotUserAgent(userAgent);
      const parsed = new UAParser(userAgent).getResult();
      const geo = ip && ip !== "unknown" ? geoip.lookup(ip) : null;

      await this.prisma.click.create({
        data: {
          linkId,
          timestamp: new Date(timestamp),
          country: geo?.country ?? null,
          browser: parsed.browser.name ?? null,
          os: parsed.os.name ?? null,
          isBot,
          userAgent,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record click for link ${linkId}: ${(err as Error).message}`);
      throw err;
    }
  }
}
