import { Body, Controller, Post, UsePipes } from "@nestjs/common";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createLinkSchema, type CreateLinkDto } from "./dto/create-link.schema";
import { LinksService } from "./links.service";

@Controller("links")
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createLinkSchema))
  async create(@Body() dto: CreateLinkDto) {
    const link = await this.linksService.create(dto);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

    return {
      slug: link.slug,
      shortUrl: `${baseUrl}/${link.slug}`,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  }
}
