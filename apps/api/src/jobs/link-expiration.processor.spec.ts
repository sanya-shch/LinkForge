import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinksCacheService } from "../cache/links-cache.service";
import type { PrismaService } from "../prisma/prisma.service";
import { LinkExpirationProcessor } from "./link-expiration.processor";

describe("LinkExpirationProcessor", () => {
  let prisma: {
    link: {
      findMany: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let cache: { invalidate: ReturnType<typeof vi.fn> };
  let processor: LinkExpirationProcessor;

  beforeEach(() => {
    prisma = {
      link: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    cache = { invalidate: vi.fn().mockResolvedValue(undefined) };
    processor = new LinkExpirationProcessor(
      prisma as unknown as PrismaService,
      cache as unknown as LinksCacheService,
    );
  });

  it("does nothing when there are no expired links", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);

    const result = await processor.process({} as Job);

    expect(result).toEqual({ deactivated: 0 });
    expect(prisma.link.updateMany).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it("deactivates a single batch of expired links and invalidates their cache entries", async () => {
    prisma.link.findMany
      .mockResolvedValueOnce([
        { id: "link-1", slug: "slug-1" },
        { id: "link-2", slug: "slug-2" },
      ])
      .mockResolvedValueOnce([]);

    const result = await processor.process({} as Job);

    expect(result).toEqual({ deactivated: 2 });
    expect(prisma.link.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["link-1", "link-2"] } },
      data: { isActive: false },
    });
    expect(cache.invalidate).toHaveBeenCalledWith("slug-1");
    expect(cache.invalidate).toHaveBeenCalledWith("slug-2");
  });

  it("loops across multiple full batches until the backlog is cleared", async () => {
    const fullBatch = Array.from({ length: 100 }, (_, i) => ({
      id: `link-${i}`,
      slug: `slug-${i}`,
    }));
    const partialBatch = [{ id: "link-last", slug: "slug-last" }];

    prisma.link.findMany.mockResolvedValueOnce(fullBatch).mockResolvedValueOnce(partialBatch);

    const result = await processor.process({} as Job);

    expect(result).toEqual({ deactivated: 101 });
    expect(prisma.link.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.link.findMany).toHaveBeenCalledTimes(2);
  });

  it("only queries active links whose expiry has passed", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);

    await processor.process({} as Job);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, expiresAt: { lte: expect.any(Date) } },
        select: { id: true, slug: true },
        take: 100,
      }),
    );
  });
});
