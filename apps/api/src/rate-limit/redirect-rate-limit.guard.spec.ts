import { HttpException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimiterRedis } from "rate-limiter-flexible";
import { RedirectRateLimitGuard } from "./redirect-rate-limit.guard";

function makeContext(slug = "some-slug") {
  const res = { setHeader: vi.fn() };
  const req = { params: { slug } };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, res };
}

describe("RedirectRateLimitGuard", () => {
  let limiter: { consume: ReturnType<typeof vi.fn> };
  let guard: RedirectRateLimitGuard;

  beforeEach(() => {
    limiter = { consume: vi.fn() };
    guard = new RedirectRateLimitGuard(limiter as unknown as RateLimiterRedis);
  });

  it("allows the request through when under the limit", async () => {
    limiter.consume.mockResolvedValueOnce({ remainingPoints: 99 });
    const { ctx } = makeContext();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("rejects with 429 and sets Retry-After when the limit is exceeded", async () => {
    limiter.consume.mockRejectedValueOnce({ msBeforeNext: 2000 });
    const { ctx, res } = makeContext();

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "2");
  });

  it("keys the limiter by slug, not by IP - protects one link regardless of how distributed the traffic is", async () => {
    limiter.consume.mockResolvedValueOnce({ remainingPoints: 99 });
    const { ctx } = makeContext("protected-slug");

    await guard.canActivate(ctx);

    expect(limiter.consume).toHaveBeenCalledWith("protected-slug");
  });

  it("two different slugs get independent buckets", async () => {
    limiter.consume.mockResolvedValue({ remainingPoints: 99 });

    await guard.canActivate(makeContext("slug-a").ctx);
    await guard.canActivate(makeContext("slug-b").ctx);

    expect(limiter.consume).toHaveBeenNthCalledWith(1, "slug-a");
    expect(limiter.consume).toHaveBeenNthCalledWith(2, "slug-b");
  });
});
