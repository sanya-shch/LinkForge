import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LinksCacheService } from "../../src/cache/links-cache.service";

describe("LinksCacheService (real Redis)", () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let service: LinksCacheService;

  beforeAll(async () => {
    container = await new RedisContainer("redis:7-alpine").start();
    redis = new Redis(container.getConnectionUrl());
    service = new LinksCacheService(redis);
  }, 60_000);

  afterAll(async () => {
    await redis?.quit();
    await container?.stop();
  });

  it("round-trips a link through set/get against real Redis", async () => {
    await service.set({
      id: "link-1",
      slug: "integration-slug",
      originalUrl: "https://example.com",
      isActive: true,
      expiresAt: null,
    });

    const cached = await service.get("integration-slug");

    expect(cached).toEqual({
      id: "link-1",
      originalUrl: "https://example.com",
      isActive: true,
      expiresAt: null,
    });
  });

  it("actually expires the key once its TTL elapses - not just the logic that computes the TTL", async () => {
    await service.set({
      id: "link-2",
      slug: "expiring-slug",
      originalUrl: "https://example.com",
      isActive: true,
      expiresAt: new Date(Date.now() + 1000),
    });

    expect(await service.get("expiring-slug")).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const rawValue = await redis.get("link:slug:expiring-slug");
    expect(rawValue).toBeNull();
  }, 10_000);

  it("invalidate() actually removes the key from Redis, not just from an in-memory mock", async () => {
    await service.set({
      id: "link-3",
      slug: "to-invalidate",
      originalUrl: "https://example.com",
      isActive: true,
      expiresAt: null,
    });

    await service.invalidate("to-invalidate");

    const rawValue = await redis.get("link:slug:to-invalidate");
    expect(rawValue).toBeNull();
  });

  it("hit/miss counters persist in Redis and are visible from a second service instance sharing the connection", async () => {
    const before = await service.getMetrics();

    await service.get("definitely-not-cached");
    await service.set({
      id: "link-4",
      slug: "hit-me",
      originalUrl: "https://example.com",
      isActive: true,
      expiresAt: null,
    });
    await service.get("hit-me");

    const otherInstance = new LinksCacheService(redis);
    const after = await otherInstance.getMetrics();

    expect(after.hits).toBeGreaterThanOrEqual(before.hits + 1);
    expect(after.misses).toBeGreaterThanOrEqual(before.misses + 1);
  });
});
