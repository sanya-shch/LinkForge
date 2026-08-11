import { BullModule } from "@nestjs/bullmq";
import { Module, OnModuleInit } from "@nestjs/common";
import { CacheModule } from "../cache/cache.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ExpirationSchedulerService } from "./expiration-scheduler.service";
import { MAINTENANCE_QUEUE } from "./jobs.constants";
import { LinkExpirationProcessor } from "./link-expiration.processor";

@Module({
  imports: [BullModule.registerQueue({ name: MAINTENANCE_QUEUE }), PrismaModule, CacheModule],
  providers: [LinkExpirationProcessor, ExpirationSchedulerService],
})
export class JobsModule implements OnModuleInit {
  constructor(private readonly scheduler: ExpirationSchedulerService) {}

  async onModuleInit(): Promise<void> {
    await this.scheduler.ensureScheduled();
  }
}
