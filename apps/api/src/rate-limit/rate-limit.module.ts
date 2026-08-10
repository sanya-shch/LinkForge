import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Redis } from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { REDIS_CLIENT } from "../redis/redis.module";
import { CreateLinkRateLimitGuard } from "./create-link-rate-limit.guard";
import { LINK_CREATION_LIMITER, REDIRECT_LIMITER } from "./rate-limit.constants";
import { RedirectRateLimitGuard } from "./redirect-rate-limit.guard";

@Global()
@Module({
  providers: [
    {
      provide: LINK_CREATION_LIMITER,
      useFactory: (redis: Redis, config: ConfigService) =>
        new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: "rl:create",
          points: config.get<number>("RATE_LIMIT_CREATE_POINTS", 10),
          duration: config.get<number>("RATE_LIMIT_CREATE_DURATION_SECONDS", 60),
        }),
      inject: [REDIS_CLIENT, ConfigService],
    },
    {
      provide: REDIRECT_LIMITER,
      useFactory: (redis: Redis, config: ConfigService) =>
        new RateLimiterRedis({
          storeClient: redis,
          keyPrefix: "rl:redirect",
          points: config.get<number>("RATE_LIMIT_REDIRECT_POINTS", 100),
          duration: config.get<number>("RATE_LIMIT_REDIRECT_DURATION_SECONDS", 60),
        }),
      inject: [REDIS_CLIENT, ConfigService],
    },
    CreateLinkRateLimitGuard,
    RedirectRateLimitGuard,
  ],
  exports: [
    LINK_CREATION_LIMITER,
    REDIRECT_LIMITER,
    CreateLinkRateLimitGuard,
    RedirectRateLimitGuard,
  ],
})
export class RateLimitModule {}
