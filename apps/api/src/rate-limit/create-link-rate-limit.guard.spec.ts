import { HttpException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimiterRedis } from "rate-limiter-flexible";
import type { MetricsService } from "../metrics/metrics.service";
import { CreateLinkRateLimitGuard } from "./create-link-rate-limit.guard";

function makeContext(ip = "1.2.3.4") {
  const res = { setHeader: vi.fn() };
  const req = { ip };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, res };
}

describe("CreateLinkRateLimitGuard", () => {
  let limiter: { consume: ReturnType<typeof vi.fn> };
  let metrics: { recordRateLimitRejection: ReturnType<typeof vi.fn> };
  let guard: CreateLinkRateLimitGuard;

  beforeEach(() => {
    limiter = { consume: vi.fn() };
    metrics = { recordRateLimitRejection: vi.fn() };
    guard = new CreateLinkRateLimitGuard(
      limiter as unknown as RateLimiterRedis,
      metrics as unknown as MetricsService,
    );
  });

  it("allows the request through when under the limit", async () => {
    limiter.consume.mockResolvedValueOnce({ remainingPoints: 9 });
    const { ctx } = makeContext();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(metrics.recordRateLimitRejection).not.toHaveBeenCalled();
  });

  it("rejects with 429 and sets Retry-After when the limit is exceeded", async () => {
    limiter.consume.mockRejectedValueOnce({ msBeforeNext: 4500 });
    const { ctx, res } = makeContext();

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "5");
  });

  it("records a rejection metric when the limit is exceeded", async () => {
    limiter.consume.mockRejectedValueOnce({ msBeforeNext: 1000 });
    const { ctx } = makeContext();

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(metrics.recordRateLimitRejection).toHaveBeenCalledWith("create_link");
  });

  it("keys the limiter by request IP, so each caller has an independent bucket", async () => {
    limiter.consume.mockResolvedValueOnce({ remainingPoints: 9 });
    const { ctx } = makeContext("9.9.9.9");

    await guard.canActivate(ctx);

    expect(limiter.consume).toHaveBeenCalledWith("9.9.9.9");
  });

  it('falls back to "unknown" as the key when the IP is unavailable', async () => {
    limiter.consume.mockResolvedValueOnce({ remainingPoints: 9 });
    const res = { setHeader: vi.fn() };
    const req = {};
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    await guard.canActivate(ctx);

    expect(limiter.consume).toHaveBeenCalledWith("unknown");
  });
});
