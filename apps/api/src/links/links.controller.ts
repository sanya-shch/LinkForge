import { Controller, Get, Body, Post, Query, UseGuards, UsePipes } from "@nestjs/common";
import { CreateLinkRateLimitGuard } from "../rate-limit/create-link-rate-limit.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createLinkSchema, type CreateLinkDto } from "./dto/create-link.schema";
import { LinksService } from "./links.service";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Controller("links")
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @UseGuards(CreateLinkRateLimitGuard)
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

  @Get()
  async findAll(@Query("page") pageParam?: string, @Query("limit") limitParam?: string) {
    const page = this.parsePositiveInt(pageParam, DEFAULT_PAGE);
    const limit = Math.min(this.parsePositiveInt(limitParam, DEFAULT_LIMIT), MAX_LIMIT);
    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

    const result = await this.linksService.findAll(page, limit);

    return {
      ...result,
      items: result.items.map(
        (link: {
          slug: string;
          originalUrl: string;
          isActive: boolean;
          expiresAt: Date | null;
          createdAt: Date;
        }) => ({
          slug: link.slug,
          shortUrl: `${baseUrl}/${link.slug}`,
          originalUrl: link.originalUrl,
          isActive: link.isActive,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
        }),
      ),
    };
  }

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
