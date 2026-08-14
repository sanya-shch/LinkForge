import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Link uniqueness (real Postgres)", () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("linkforge_test")
      .withUsername("test")
      .withPassword("test")
      .start();

    const databaseUrl = container.getConnectionUri();

    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it("enforces the unique constraint on slug: of two concurrent inserts with the same slug, exactly one succeeds", async () => {
    const slug = "race-real-pg";

    const results = await Promise.allSettled([
      prisma.link.create({
        data: { slug, originalUrl: "https://a.example.com" },
      }),
      prisma.link.create({
        data: { slug, originalUrl: "https://b.example.com" },
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const stored = await prisma.link.findUnique({ where: { slug } });
    expect(stored).not.toBeNull();
  });

  it("persists and retrieves a link by slug with all fields intact", async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    await prisma.link.create({
      data: {
        slug: "persisted-link",
        originalUrl: "https://persisted.example.com",
        isCustomAlias: true,
        expiresAt,
      },
    });

    const found = await prisma.link.findUnique({
      where: { slug: "persisted-link" },
    });

    expect(found?.originalUrl).toBe("https://persisted.example.com");
    expect(found?.isCustomAlias).toBe(true);
    expect(found?.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  it("cascades deleting a link to its clicks (onDelete: Cascade in the schema)", async () => {
    const link = await prisma.link.create({
      data: { slug: "cascade-test", originalUrl: "https://cascade.example.com" },
    });
    await prisma.click.create({
      data: { linkId: link.id, browser: "Chrome", isBot: false },
    });

    await prisma.link.delete({ where: { id: link.id } });

    const remainingClicks = await prisma.click.findMany({
      where: { linkId: link.id },
    });
    expect(remainingClicks).toHaveLength(0);
  });

  it("allows the same customAlias to be reused after the original link is deleted", async () => {
    const first = await prisma.link.create({
      data: { slug: "reusable-slug", originalUrl: "https://first.example.com" },
    });
    await prisma.link.delete({ where: { id: first.id } });

    const second = await prisma.link.create({
      data: { slug: "reusable-slug", originalUrl: "https://second.example.com" },
    });

    expect(second.originalUrl).toBe("https://second.example.com");
  });
});
