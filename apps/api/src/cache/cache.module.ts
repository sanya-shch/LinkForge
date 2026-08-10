import { Module } from "@nestjs/common";
import { LinksCacheService } from "./links-cache.service";

@Module({
  providers: [LinksCacheService],
  exports: [LinksCacheService],
})
export class CacheModule {}
