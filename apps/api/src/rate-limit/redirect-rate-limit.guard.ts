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
import { REDIRECT_LIMITER } from "./rate-limit.constants";
import { resolveRetryAfterSeconds } from "./rate-limit.util";

@Injectable()
export class RedirectRateLimitGuard implements CanActivate {
  constructor(
    @Inject(REDIRECT_LIMITER) private readonly limiter: RateLimiterRedis,
    private readonly metrics: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const slug = req.params.slug;

    try {
      await this.limiter.consume(slug);
      return true;
    } catch (rejection) {
      this.metrics.recordRateLimitRejection("redirect");
      res.setHeader("Retry-After", String(resolveRetryAfterSeconds(rejection)));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Too many requests for this link, please slow down",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
