import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { CacheModule } from "../cache/cache.module";
import { LinksModule } from "../links/links.module";
import { RedirectController } from "./redirect.controller";

@Module({
  imports: [LinksModule, CacheModule, AnalyticsModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
