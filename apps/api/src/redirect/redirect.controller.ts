import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { LinksCacheService } from "../cache/links-cache.service";
import { LinksService } from "../links/links.service";

@Controller()
export class RedirectController {
  constructor(
    private readonly linksService: LinksService,
    private readonly cache: LinksCacheService,
  ) {}

  @Get(":slug")
  async redirect(@Param("slug") slug: string, @Res() res: Response) {
    const cached = await this.cache.get(slug);

    if (cached) {
      if (cached.isActive && !this.isExpired(cached.expiresAt)) {
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

    return res.redirect(302, link.originalUrl);
  }

  private isExpired(expiresAt: string | null): boolean {
    return expiresAt !== null && new Date(expiresAt).getTime() < Date.now();
  }
}
