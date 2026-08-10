import { NotFoundException } from "@nestjs/common";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClickTrackerService } from "../analytics/click-tracker.service";
import type { LinksCacheService } from "../cache/links-cache.service";
import type { LinksService } from "../links/links.service";
import { RedirectController } from "./redirect.controller";

function makeRes() {
  return { redirect: vi.fn() } as unknown as Response;
}

function makeReq() {
  return { headers: { "user-agent": "Mozilla/5.0 (test)" }, ip: "1.2.3.4" } as unknown as Request;
}

describe("RedirectController", () => {
  let linksService: { findBySlug: ReturnType<typeof vi.fn> };
  let cache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let clickTracker: { track: ReturnType<typeof vi.fn> };
  let controller: RedirectController;

  beforeEach(() => {
    linksService = { findBySlug: vi.fn() };
    cache = { get: vi.fn(), set: vi.fn(), invalidate: vi.fn() };
    clickTracker = { track: vi.fn().mockResolvedValue(undefined) };
    controller = new RedirectController(
      linksService as unknown as LinksService,
      cache as unknown as LinksCacheService,
      clickTracker as unknown as ClickTrackerService,
    );
  });

  it("redirects straight from cache on a hit, without touching the DB", async () => {
    cache.get.mockResolvedValueOnce({
      id: "link-1",
      originalUrl: "https://cached.example.com",
      isActive: true,
      expiresAt: null,
    });
    const res = makeRes();

    await controller.redirect("cached-slug", makeReq(), res);

    expect(res.redirect).toHaveBeenCalledWith(302, "https://cached.example.com");
    expect(linksService.findBySlug).not.toHaveBeenCalled();
  });

  it("tracks a click (by linkId) on a cache hit", async () => {
    cache.get.mockResolvedValueOnce({
      id: "link-1",
      originalUrl: "https://cached.example.com",
      isActive: true,
      expiresAt: null,
    });

    await controller.redirect("cached-slug", makeReq(), makeRes());

    expect(clickTracker.track).toHaveBeenCalledWith("link-1", expect.anything());
  });

  it("falls back to the DB on a cache miss and populates the cache", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce({
      id: "link-2",
      slug: "fresh-slug",
      originalUrl: "https://fresh.example.com",
      isActive: true,
      expiresAt: null,
    });
    const res = makeRes();

    await controller.redirect("fresh-slug", makeReq(), res);

    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith(302, "https://fresh.example.com");
    expect(clickTracker.track).toHaveBeenCalledWith("link-2", expect.anything());
  });

  it("invalidates a stale cache entry and re-checks the DB instead of trusting it", async () => {
    cache.get.mockResolvedValueOnce({
      id: "link-3",
      originalUrl: "https://stale.example.com",
      isActive: true,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("stale-slug", makeReq(), res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cache.invalidate).toHaveBeenCalledWith("stale-slug");
  });

  it("invalidates a cache entry that was deactivated after being cached", async () => {
    cache.get.mockResolvedValueOnce({
      id: "link-4",
      originalUrl: "https://deactivated.example.com",
      isActive: false,
      expiresAt: null,
    });
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("deactivated-slug", makeReq(), res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cache.invalidate).toHaveBeenCalledWith("deactivated-slug");
  });

  it("throws 404 when the slug does not exist anywhere", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce(null);
    const res = makeRes();

    await expect(controller.redirect("missing", makeReq(), res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws 404 for an expired link found directly in the DB (never cached) and does not track a click", async () => {
    cache.get.mockResolvedValueOnce(null);
    linksService.findBySlug.mockResolvedValueOnce({
      id: "link-5",
      slug: "db-expired",
      originalUrl: "https://expired.example.com",
      isActive: true,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = makeRes();

    await expect(controller.redirect("db-expired", makeReq(), res)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cache.set).not.toHaveBeenCalled();
    expect(clickTracker.track).not.toHaveBeenCalled();
  });
});
