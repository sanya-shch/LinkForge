import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { LinksService } from "../links/links.service";
import { AnalyticsService } from "./analytics.service";

@Controller("links")
export class AnalyticsController {
  constructor(
    private readonly linksService: LinksService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get(":slug/analytics")
  async getAnalytics(@Param("slug") slug: string) {
    const link = await this.linksService.findBySlug(slug);

    if (!link) {
      throw new NotFoundException("Short link not found");
    }

    return this.analyticsService.getSummary(link.id);
  }

  @Get(":slug/clicks")
  async getClicks(@Param("slug") slug: string) {
    const link = await this.linksService.findBySlug(slug);

    if (!link) {
      throw new NotFoundException("Short link not found");
    }

    return this.analyticsService.getRecentClicks(link.id);
  }
}
