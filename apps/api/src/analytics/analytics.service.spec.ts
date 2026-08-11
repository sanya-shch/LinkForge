import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  let prisma: {
    click: {
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    $queryRaw: ReturnType<typeof vi.fn>;
  };
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = {
      click: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      $queryRaw: vi.fn(),
    };
    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  it("combines total/bot counts and per-dimension breakdowns into one summary", async () => {
    prisma.click.count.mockResolvedValueOnce(120).mockResolvedValueOnce(20);
    prisma.click.groupBy
      .mockResolvedValueOnce([
        { country: "US", _count: { _all: 60 } },
        { country: "UA", _count: { _all: 40 } },
      ])
      .mockResolvedValueOnce([{ browser: "Chrome", _count: { _all: 100 } }]);
    prisma.$queryRaw.mockResolvedValueOnce([
      { day: "2026-01-01", count: 50n },
      { day: "2026-01-02", count: 50n },
    ]);

    const summary = await service.getSummary("link-1");

    expect(summary).toEqual({
      totalClicks: 120,
      humanClicks: 100,
      botClicks: 20,
      byCountry: [
        { country: "US", count: 60 },
        { country: "UA", count: 40 },
      ],
      byBrowser: [{ browser: "Chrome", count: 100 }],
      byDay: [
        { day: "2026-01-01", count: 50 },
        { day: "2026-01-02", count: 50 },
      ],
    });
  });

  it("scopes every query to the given linkId", async () => {
    prisma.click.count.mockResolvedValue(0);
    prisma.click.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);

    await service.getSummary("specific-link");

    expect(prisma.click.count).toHaveBeenCalledWith({
      where: { linkId: "specific-link" },
    });
    expect(prisma.click.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { linkId: "specific-link", isBot: false } }),
    );
  });

  it("returns zeroed-out results for a link with no clicks yet", async () => {
    prisma.click.count.mockResolvedValue(0);
    prisma.click.groupBy.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);

    const summary = await service.getSummary("fresh-link");

    expect(summary.totalClicks).toBe(0);
    expect(summary.humanClicks).toBe(0);
    expect(summary.botClicks).toBe(0);
    expect(summary.byCountry).toEqual([]);
  });
});

describe("AnalyticsService.getRecentClicks", () => {
  let prisma: { click: { findMany: ReturnType<typeof vi.fn> } };
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = { click: { findMany: vi.fn() } };
    service = new AnalyticsService(prisma as unknown as PrismaService);
  });

  it("fetches clicks for the given link, newest first, bounded to 1000 rows", async () => {
    prisma.click.findMany.mockResolvedValueOnce([]);

    await service.getRecentClicks("link-1");

    expect(prisma.click.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { linkId: "link-1" },
        orderBy: { timestamp: "desc" },
        take: 1000,
      }),
    );
  });

  it("returns the rows as-is from Prisma", async () => {
    const rows = [
      {
        id: "c1",
        timestamp: new Date(),
        country: "US",
        browser: "Chrome",
        os: "Mac OS",
        isBot: false,
      },
    ];
    prisma.click.findMany.mockResolvedValueOnce(rows);

    const result = await service.getRecentClicks("link-1");

    expect(result).toEqual(rows);
  });
});
