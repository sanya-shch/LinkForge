import { Controller, Get, NotFoundException, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { LinksService } from "../links/links.service";
import { QrService, type QrFormat } from "./qr.service";

@Controller("links")
export class QrController {
  constructor(
    private readonly linksService: LinksService,
    private readonly qrService: QrService,
  ) {}

  @Get(":slug/qr")
  async getQr(
    @Param("slug") slug: string,
    @Query("format") format: string | undefined,
    @Res() res: Response,
  ) {
    const link = await this.linksService.findBySlug(slug);

    if (!link) {
      throw new NotFoundException("Short link not found");
    }

    const resolvedFormat: QrFormat = format === "svg" ? "svg" : "png";
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
    const shortUrl = `${baseUrl}/${link.slug}`;

    const qr = await this.qrService.generate(shortUrl, resolvedFormat);

    res.setHeader("Content-Type", resolvedFormat === "svg" ? "image/svg+xml" : "image/png");
    return res.send(qr);
  }
}
