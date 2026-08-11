import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { CLICKS_QUEUE } from "../analytics/analytics.constants";
import { CacheModule } from "../cache/cache.module";
import { MAINTENANCE_QUEUE } from "../jobs/jobs.constants";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: CLICKS_QUEUE }, { name: MAINTENANCE_QUEUE }),
    CacheModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
