import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { LinksService } from "./links.service";

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the fields: (`slug`)",
    { code: "P2002", clientVersion: "5.20.0" },
  );
}

describe("LinksService", () => {
  let prisma: {
    link: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };
  let service: LinksService;

  beforeEach(() => {
    prisma = {
      link: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    };
    service = new LinksService(prisma as unknown as PrismaService);
  });

  it("creates a link with a custom alias", async () => {
    prisma.link.create.mockResolvedValueOnce({
      id: "1",
      slug: "my-alias",
      originalUrl: "https://example.com",
    });

    const result = await service.create({
      originalUrl: "https://example.com",
      customAlias: "my-alias",
    });

    expect(result.slug).toBe("my-alias");
    expect(prisma.link.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "my-alias",
        isCustomAlias: true,
      }),
    });
  });

  it("throws ConflictException when a custom alias is already taken", async () => {
    prisma.link.create.mockRejectedValueOnce(uniqueConstraintError());

    await expect(
      service.create({
        originalUrl: "https://example.com",
        customAlias: "taken",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.link.create).toHaveBeenCalledTimes(1);
  });

  it("handles two concurrent requests for the same custom alias: exactly one succeeds", async () => {
    prisma.link.create
      .mockResolvedValueOnce({
        id: "1",
        slug: "race",
        originalUrl: "https://a.example.com",
      })
      .mockRejectedValueOnce(uniqueConstraintError());

    const results = await Promise.allSettled([
      service.create({ originalUrl: "https://a.example.com", customAlias: "race" }),
      service.create({ originalUrl: "https://b.example.com", customAlias: "race" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
  });

  it("retries with a fresh slug on an auto-generated slug collision", async () => {
    prisma.link.create.mockRejectedValueOnce(uniqueConstraintError()).mockResolvedValueOnce({
      id: "2",
      slug: "freshSlug",
      originalUrl: "https://c.example.com",
    });

    const result = await service.create({ originalUrl: "https://c.example.com" });

    expect(result.slug).toBe("freshSlug");
    expect(prisma.link.create).toHaveBeenCalledTimes(2);
  });

  it("gives up after MAX_AUTO_SLUG_RETRIES and surfaces a conflict", async () => {
    prisma.link.create.mockRejectedValue(uniqueConstraintError());

    await expect(service.create({ originalUrl: "https://d.example.com" })).rejects.toBeInstanceOf(
      ConflictException,
    );

    // initial attempt (0) + 3 retries = 4 calls total
    expect(prisma.link.create).toHaveBeenCalledTimes(4);
  });

  it("re-throws errors unrelated to unique constraints", async () => {
    const dbDown = new Error("connection refused");
    prisma.link.create.mockRejectedValueOnce(dbDown);

    await expect(service.create({ originalUrl: "https://e.example.com" })).rejects.toThrow(
      "connection refused",
    );
  });
});

describe("LinksService.findAll", () => {
  let prisma: {
    link: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };
  let service: LinksService;

  beforeEach(() => {
    prisma = { link: { findMany: vi.fn(), count: vi.fn() } };
    service = new LinksService(prisma as unknown as PrismaService);
  });

  it("paginates using the correct skip/take for a given page and limit", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);
    prisma.link.count.mockResolvedValueOnce(0);

    await service.findAll(3, 20);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it("orders results by newest first", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);
    prisma.link.count.mockResolvedValueOnce(0);

    await service.findAll(1, 20);

    expect(prisma.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } }),
    );
  });

  it("computes totalPages from the total count and limit", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);
    prisma.link.count.mockResolvedValueOnce(45);

    const result = await service.findAll(1, 20);

    expect(result).toEqual(
      expect.objectContaining({ total: 45, page: 1, limit: 20, totalPages: 3 }),
    );
  });

  it("reports at least 1 total page even when there are no links yet", async () => {
    prisma.link.findMany.mockResolvedValueOnce([]);
    prisma.link.count.mockResolvedValueOnce(0);

    const result = await service.findAll(1, 20);

    expect(result.totalPages).toBe(1);
  });
});
