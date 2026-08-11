import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { RateLimiterRedis } from "rate-limiter-flexible";
import { MetricsService } from "../metrics/metrics.service";
import { LINK_CREATION_LIMITER } from "./rate-limit.constants";
import { resolveRetryAfterSeconds } from "./rate-limit.util";

@Injectable()
export class CreateLinkRateLimitGuard implements CanActivate {
  constructor(
    @Inject(LINK_CREATION_LIMITER) private readonly limiter: RateLimiterRedis,
    private readonly metrics: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = req.ip ?? "unknown";

    try {
      await this.limiter.consume(key);
      return true;
    } catch (rejection) {
      this.metrics.recordRateLimitRejection("create_link");
      res.setHeader("Retry-After", String(resolveRetryAfterSeconds(rejection)));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many link creation requests, please slow down",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
