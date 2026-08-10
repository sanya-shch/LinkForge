import { Module } from "@nestjs/common";
import { CacheModule } from "../cache/cache.module";
import { LinksModule } from "../links/links.module";
import { RedirectController } from "./redirect.controller";

@Module({
  imports: [LinksModule, CacheModule],
  controllers: [RedirectController],
})
export class RedirectModule {}
