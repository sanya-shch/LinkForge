import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface LinkAnalyticsSummary {
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  byCountry: Array<{ country: string | null; count: number }>;
  byBrowser: Array<{ browser: string | null; count: number }>;
  byDay: Array<{ day: string; count: number }>;
}

export interface ClickLogEntry {
  id: string;
  timestamp: Date;
  country: string | null;
  browser: string | null;
  os: string | null;
  isBot: boolean;
}

const MAX_CLICK_LOG_ROWS = 1000;

interface DayBucket {
  day: string;
  count: bigint;
}

interface CountryGroup {
  country: string | null;
  _count: { _all: number };
}

interface BrowserGroup {
  browser: string | null;
  _count: { _all: number };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(linkId: string): Promise<LinkAnalyticsSummary> {
    const [totalClicks, botClicks, byCountryRaw, byBrowserRaw, byDayRaw] = await Promise.all([
      this.prisma.click.count({ where: { linkId } }),
      this.prisma.click.count({ where: { linkId, isBot: true } }),
      this.prisma.click.groupBy({
        by: ["country"],
        where: { linkId, isBot: false },
        _count: { _all: true },
      }),
      this.prisma.click.groupBy({
        by: ["browser"],
        where: { linkId, isBot: false },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<DayBucket[]>`
          SELECT to_char(date_trunc('day', "timestamp"), 'YYYY-MM-DD') as day,
                 COUNT(*) as count
          FROM "Click"
          WHERE "linkId" = ${linkId} AND "isBot" = false
          GROUP BY 1
          ORDER BY 1
        `,
    ]);

    const countryGroups = byCountryRaw as unknown as CountryGroup[];
    const browserGroups = byBrowserRaw as unknown as BrowserGroup[];

    return {
      totalClicks,
      humanClicks: totalClicks - botClicks,
      botClicks,
      byCountry: countryGroups.map((row) => ({
        country: row.country,
        count: row._count._all,
      })),
      byBrowser: browserGroups.map((row) => ({
        browser: row.browser,
        count: row._count._all,
      })),
      byDay: byDayRaw.map((row: DayBucket) => ({
        day: row.day,
        count: Number(row.count),
      })),
    };
  }

  async getRecentClicks(linkId: string): Promise<ClickLogEntry[]> {
    return this.prisma.click.findMany({
      where: { linkId },
      orderBy: { timestamp: "desc" },
      take: MAX_CLICK_LOG_ROWS,
      select: {
        id: true,
        timestamp: true,
        country: true,
        browser: true,
        os: true,
        isBot: true,
      },
    });
  }
}
