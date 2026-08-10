import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { LinksService } from "../links/links.service";

@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(":slug")
  async redirect(@Param("slug") slug: string, @Res() res: Response) {
    const link = await this.linksService.findBySlug(slug);

    if (!link || !link.isActive) {
      throw new NotFoundException("Short link not found");
    }

    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException("Short link has expired");
    }

    return res.redirect(302, link.originalUrl);
  }
}
