import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { customAlphabet } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateLinkDto } from "./dto/create-link.schema";

const SLUG_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SLUG_LENGTH = 7;
const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";
const MAX_AUTO_SLUG_RETRIES = 3;

const generateSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateLinkDto,
    attempt = 0,
  ): Promise<Awaited<ReturnType<PrismaService["link"]["create"]>>> {
    const slug = dto.customAlias ?? generateSlug();

    try {
      return await this.prisma.link.create({
        data: {
          slug,
          originalUrl: dto.originalUrl,
          isCustomAlias: Boolean(dto.customAlias),
          expiresAt: dto.expiresAt ?? null,
        },
      });
    } catch (err) {
      if (!this.isUniqueConstraintError(err)) {
        throw err;
      }

      if (dto.customAlias) {
        throw new ConflictException(`Alias "${dto.customAlias}" is already taken`);
      }

      if (attempt >= MAX_AUTO_SLUG_RETRIES) {
        throw new ConflictException("Could not generate a unique short link, please try again");
      }

      return this.create(dto, attempt + 1);
    }
  }

  async findBySlug(slug: string) {
    return this.prisma.link.findUnique({ where: { slug } });
  }

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.link.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.link.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private isUniqueConstraintError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === PRISMA_UNIQUE_CONSTRAINT_CODE
    );
  }
}
