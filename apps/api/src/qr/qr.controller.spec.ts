import { NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinksService } from "../links/links.service";
import { QrController } from "./qr.controller";
import type { QrService } from "./qr.service";

function makeRes() {
  return { setHeader: vi.fn(), send: vi.fn() } as unknown as Response;
}

describe("QrController", () => {
  let linksService: { findBySlug: ReturnType<typeof vi.fn> };
  let qrService: { generate: ReturnType<typeof vi.fn> };
  let controller: QrController;

  beforeEach(() => {
    linksService = { findBySlug: vi.fn() };
    qrService = { generate: vi.fn() };
    controller = new QrController(
      linksService as unknown as LinksService,
      qrService as unknown as QrService,
    );
  });

  it("throws 404 when the slug does not exist", async () => {
    linksService.findBySlug.mockResolvedValueOnce(null);

    await expect(controller.getQr("missing", undefined, makeRes())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("defaults to PNG when no format is given, with the correct content type", async () => {
    linksService.findBySlug.mockResolvedValueOnce({ slug: "abc" });
    qrService.generate.mockResolvedValueOnce(Buffer.from("fake-png"));
    const res = makeRes();

    await controller.getQr("abc", undefined, res);

    expect(qrService.generate).toHaveBeenCalledWith(expect.any(String), "png");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
  });

  it("generates SVG with the correct content type when format=svg", async () => {
    linksService.findBySlug.mockResolvedValueOnce({ slug: "abc" });
    qrService.generate.mockResolvedValueOnce("<svg></svg>");
    const res = makeRes();

    await controller.getQr("abc", "svg", res);

    expect(qrService.generate).toHaveBeenCalledWith(expect.any(String), "svg");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
  });

  it("falls back to PNG for an unrecognized format value", async () => {
    linksService.findBySlug.mockResolvedValueOnce({ slug: "abc" });
    qrService.generate.mockResolvedValueOnce(Buffer.from("fake-png"));
    const res = makeRes();

    await controller.getQr("abc", "jpeg", res);

    expect(qrService.generate).toHaveBeenCalledWith(expect.any(String), "png");
  });

  it("builds the QR target from the slug using the configured base URL", async () => {
    const originalBaseUrl = process.env.PUBLIC_BASE_URL;
    process.env.PUBLIC_BASE_URL = "https://short.example";
    linksService.findBySlug.mockResolvedValueOnce({ slug: "my-alias" });
    qrService.generate.mockResolvedValueOnce(Buffer.from("fake-png"));

    await controller.getQr("my-alias", undefined, makeRes());

    expect(qrService.generate).toHaveBeenCalledWith("https://short.example/my-alias", "png");

    process.env.PUBLIC_BASE_URL = originalBaseUrl;
  });
});
