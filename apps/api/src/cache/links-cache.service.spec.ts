import type { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LinksCacheService } from "./links-cache.service";

describe("LinksCacheService", () => {
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
  };
  let service: LinksCacheService;

  beforeEach(() => {
    redis = { get: vi.fn(), set: vi.fn(), del: vi.fn(), incr: vi.fn() };
    service = new LinksCacheService(redis as unknown as Redis);
  });

  it("returns null and increments the miss counter on a cache miss", async () => {
    redis.get.mockResolvedValueOnce(null);

    const result = await service.get("missing");

    expect(result).toBeNull();
    expect(redis.incr).toHaveBeenCalledWith("metrics:redirect_cache:misses");
  });

  it("parses cached JSON and increments the hit counter on a cache hit", async () => {
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        id: "link-present",
        originalUrl: "https://a.example.com",
        isActive: true,
        expiresAt: null,
      }),
    );

    const result = await service.get("present");

    expect(result).toEqual({
      id: "link-present",
      originalUrl: "https://a.example.com",
      isActive: true,
      expiresAt: null,
    });
    expect(redis.incr).toHaveBeenCalledWith("metrics:redirect_cache:hits");
  });

  it("treats a cache entry with no id (stale pre-migration schema) as a miss and deletes it", async () => {
    redis.get.mockResolvedValueOnce(
      JSON.stringify({
        originalUrl: "https://legacy.example.com",
        isActive: true,
        expiresAt: null,
      }),
    );

    const result = await service.get("legacy-slug");

    expect(result).toBeNull();
    expect(redis.del).toHaveBeenCalledWith("link:slug:legacy-slug");
    expect(redis.incr).toHaveBeenCalledWith("metrics:redirect_cache:misses");
    expect(redis.incr).not.toHaveBeenCalledWith("metrics:redirect_cache:hits");
  });

  it("caches a link with the default TTL when there is no expiry", async () => {
    await service.set({
      id: "link-1",
      slug: "no-expiry",
      originalUrl: "https://a.example.com",
      isActive: true,
      expiresAt: null,
    });

    expect(redis.set).toHaveBeenCalledWith("link:slug:no-expiry", expect.any(String), "EX", 3600);
  });

  it("caps the TTL at the remaining time until expiry when shorter than default", async () => {
    const expiresAt = new Date(Date.now() + 30_000);

    await service.set({
      id: "link-2",
      slug: "expiring-soon",
      originalUrl: "https://a.example.com",
      isActive: true,
      expiresAt,
    });

    expect(redis.set).toHaveBeenCalledTimes(1);
    const ttlArg = redis.set.mock.calls[0][3];
    expect(ttlArg).toBeLessThanOrEqual(30);
    expect(ttlArg).toBeGreaterThan(0);
  });

  it("does not cache a link that is already expired", async () => {
    await service.set({
      id: "link-3",
      slug: "already-expired",
      originalUrl: "https://a.example.com",
      isActive: true,
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(redis.set).not.toHaveBeenCalled();
  });

  it("removes the cache entry on invalidate", async () => {
    await service.invalidate("some-slug");

    expect(redis.del).toHaveBeenCalledWith("link:slug:some-slug");
  });

  it("reports current hit/miss counters", async () => {
    redis.get.mockImplementation((key: string) => {
      if (key === "metrics:redirect_cache:hits") return Promise.resolve("12");
      if (key === "metrics:redirect_cache:misses") return Promise.resolve("3");
      return Promise.resolve(null);
    });

    const metrics = await service.getMetrics();

    expect(metrics).toEqual({ hits: 12, misses: 3 });
  });
});
