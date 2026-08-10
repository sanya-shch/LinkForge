import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { LinksModule } from "../links/links.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { CLICKS_QUEUE } from "./analytics.constants";
import { ClickProcessor } from "./click.processor";
import { ClickTrackerService } from "./click-tracker.service";

@Module({
  imports: [BullModule.registerQueue({ name: CLICKS_QUEUE }), LinksModule],
  controllers: [AnalyticsController],
  providers: [ClickTrackerService, ClickProcessor, AnalyticsService],
  exports: [ClickTrackerService],
})
export class AnalyticsModule {}
