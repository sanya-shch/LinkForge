import { Controller, Get, NotFoundException, Param, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { ClickTrackerService } from "../analytics/click-tracker.service";
import { LinksCacheService } from "../cache/links-cache.service";
import { LinksService } from "../links/links.service";
import { RedirectRateLimitGuard } from "../rate-limit/redirect-rate-limit.guard";

@Controller()
export class RedirectController {
  constructor(
    private readonly linksService: LinksService,
    private readonly cache: LinksCacheService,
    private readonly clickTracker: ClickTrackerService,
  ) {}

  @Get(":slug")
  @UseGuards(RedirectRateLimitGuard)
  async redirect(@Param("slug") slug: string, @Req() req: Request, @Res() res: Response) {
    const cached = await this.cache.get(slug);

    if (cached) {
      if (cached.isActive && !this.isExpired(cached.expiresAt)) {
        void this.clickTracker.track(cached.id, req);
        return res.redirect(302, cached.originalUrl);
      }

      await this.cache.invalidate(slug);
    }

    const link = await this.linksService.findBySlug(slug);

    if (!link || !link.isActive) {
      throw new NotFoundException("Short link not found");
    }

    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException("Short link has expired");
    }

    await this.cache.set(link);
    void this.clickTracker.track(link.id, req);

    return res.redirect(302, link.originalUrl);
  }

  private isExpired(expiresAt: string | null): boolean {
    return expiresAt !== null && new Date(expiresAt).getTime() < Date.now();
  }
}
