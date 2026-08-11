import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { LinksCacheService } from "../cache/links-cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { MAINTENANCE_QUEUE } from "./jobs.constants";

const BATCH_SIZE = 100;

@Processor(MAINTENANCE_QUEUE)
export class LinkExpirationProcessor extends WorkerHost {
  private readonly logger = new Logger(LinkExpirationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: LinksCacheService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ deactivated: number }> {
    let totalDeactivated = 0;

    for (;;) {
      const expired: Array<{ id: string; slug: string }> = await this.prisma.link.findMany({
        where: { isActive: true, expiresAt: { lte: new Date() } },
        select: { id: true, slug: true },
        take: BATCH_SIZE,
      });

      if (expired.length === 0) {
        break;
      }

      await this.prisma.link.updateMany({
        where: { id: { in: expired.map((link: { id: string }) => link.id) } },
        data: { isActive: false },
      });

      await Promise.all(expired.map((link: { slug: string }) => this.cache.invalidate(link.slug)));

      totalDeactivated += expired.length;

      if (expired.length < BATCH_SIZE) {
        break;
      }
    }

    if (totalDeactivated > 0) {
      this.logger.log(`Deactivated ${totalDeactivated} expired link(s)`);
    }

    return { deactivated: totalDeactivated };
  }
}
