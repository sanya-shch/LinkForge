import { Inject, Injectable } from "@nestjs/common";
import type { Link } from "@prisma/client";
import type { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

const CACHE_KEY_PREFIX = "link:slug:";
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const HITS_COUNTER_KEY = "metrics:redirect_cache:hits";
const MISSES_COUNTER_KEY = "metrics:redirect_cache:misses";

export interface CachedLink {
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
}

type CacheableLink = Pick<Link, "slug" | "originalUrl" | "isActive" | "expiresAt">;

@Injectable()
export class LinksCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(slug: string): Promise<CachedLink | null> {
    const raw = await this.redis.get(this.key(slug));

    if (!raw) {
      await this.redis.incr(MISSES_COUNTER_KEY);
      return null;
    }

    await this.redis.incr(HITS_COUNTER_KEY);
    return JSON.parse(raw) as CachedLink;
  }

  async set(link: CacheableLink): Promise<void> {
    const ttl = this.resolveTtl(link.expiresAt);

    if (ttl <= 0) {
      return;
    }

    const value: CachedLink = {
      originalUrl: link.originalUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    };

    await this.redis.set(this.key(link.slug), JSON.stringify(value), "EX", ttl);
  }

  async invalidate(slug: string): Promise<void> {
    await this.redis.del(this.key(slug));
  }

  async getMetrics(): Promise<{ hits: number; misses: number }> {
    const [hits, misses] = await Promise.all([
      this.redis.get(HITS_COUNTER_KEY),
      this.redis.get(MISSES_COUNTER_KEY),
    ]);

    return { hits: Number(hits ?? 0), misses: Number(misses ?? 0) };
  }

  private key(slug: string): string {
    return `${CACHE_KEY_PREFIX}${slug}`;
  }

  private resolveTtl(expiresAt: Date | null): number {
    if (!expiresAt) {
      return DEFAULT_TTL_SECONDS;
    }

    const secondsUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    return Math.min(DEFAULT_TTL_SECONDS, secondsUntilExpiry);
  }
}
