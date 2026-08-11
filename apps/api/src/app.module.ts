import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AnalyticsModule } from "./analytics/analytics.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { LinksModule } from "./links/links.module";
import { MetricsModule } from "./metrics/metrics.module";
import { QrModule } from "./qr/qr.module";
import { RedirectModule } from "./redirect/redirect.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>("REDIS_URL", "redis://localhost:6379"));

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    PrismaModule,
    RedisModule,
    MetricsModule,
    RateLimitModule,
    HealthModule,
    LinksModule,
    AnalyticsModule,
    JobsModule,
    QrModule,
    RedirectModule,
  ],
})
export class AppModule {}
