import { NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinksCacheService } from "../cache/links-cache.service";
import type { LinksService } from "../links/links.service";
import { RedirectController } from "./redirect.controller";

function makeRes() {
  return { redirect: vi.fn() } as unknown as Response;
}

describe("RedirectController", () => {
  let linksService: { findBySlug: ReturnType<typeof vi.fn> };
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let controller: RedirectController;

  beforeEach(() => {
    linksService = { findBySlug: vi.fn() };
    cache = { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() };
    controller = new RedirectController(
      linksService as unknown as LinksService,
      cache as unknown as LinksCacheService,
    );
  });

  it("redirects straight from cache on a hit, without touching the DB", async () => {
    cache.get.mockResolvedValueOnce({
      originalUrl: "https://cached.example.com",
      isActive: true,
      expiresAt: null,
    });
    const res = makeRes();

    await controller.redirect("cached-slug", res);

    expect(res.redirect).toHaveBeenCalledWith(302, "https://cached.example.com");
    expect(linksService.findBySlug).not.toHaveBeenCalled();
  });

  it("falls back to the DB on a cache miss and populates the cache", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce({
      slug: "fresh-slug",
      originalUrl: "https://fresh.example.com",
      isActive: true,
      expiresAt: null,
    });
    const res = makeRes();

    await controller.redirect("fresh-slug", res);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith(302, "https://fresh.example.com");
  });

  it("invalidates a stale cache entry and re-checks the DB instead of trusting it", async () => {
    cache.get.mockResolvedValueOnce({
      originalUrl: "https://stale.example.com",
      isActive: true,
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired since caching
    });
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("stale-slug", res)).rejects.toBeInstanceOf(NotFoundException);
    expect(cache.invalidate).toHaveBeenCalledWith("stale-slug");
  });

  it("invalidates a cache entry that was deactivated after being cached", async () => {
    cache.get.mockResolvedValueOnce({
      originalUrl: "https://deactivated.example.com",
      isActive: false,
      expiresAt: null,
    });
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("deactivated-slug", res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cache.invalidate).toHaveBeenCalledWith("deactivated-slug");
  });

  it("throws 404 when the slug does not exist anywhere", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("missing", res)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws 404 for an expired link found directly in the DB (never cached)", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce({
      slug: "db-expired",
      originalUrl: "https://expired.example.com",
      isActive: true,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = makeRes();

    await expect(controller.redirect("db-expired", res)).rejects.toBeInstanceOf(NotFoundException);
    expect(cache.set).not.toHaveBeenCalled();
  });
});
