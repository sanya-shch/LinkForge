import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import type { ClickJobData } from "./click-tracker.service";

vi.mock("geoip-lite", () => ({
  default: {
    lookup: vi.fn(),
  },
}));

import geoip from "geoip-lite";
import { ClickProcessor } from "./click.processor";

function makeJob(data: Partial<ClickJobData> = {}): Job<ClickJobData> {
  return {
    data: {
      linkId: "link-1",
      timestamp: new Date("2026-01-01T12:00:00.000Z").toISOString(),
      ip: "8.8.8.8",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ...data,
    },
  } as Job<ClickJobData>;
}

describe("ClickProcessor", () => {
  let prisma: { click: { create: ReturnType<typeof vi.fn> } };
  let processor: ClickProcessor;

  beforeEach(() => {
    vi.mocked(geoip.lookup).mockReset();
    prisma = { click: { create: vi.fn().mockResolvedValue({}) } };
    processor = new ClickProcessor(prisma as unknown as PrismaService);
  });

  it("parses the browser/OS from the User-Agent and writes a non-bot Click", async () => {
    vi.mocked(geoip.lookup).mockReturnValueOnce({
      country: "US",
    } as ReturnType<typeof geoip.lookup>);

    await processor.process(makeJob());

    expect(prisma.click.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        linkId: "link-1",
        country: "US",
        browser: "Chrome",
        os: "Mac OS",
        isBot: false,
      }),
    });
  });

  it("flags a known crawler User-Agent as a bot", async () => {
    vi.mocked(geoip.lookup).mockReturnValueOnce(null);

    await processor.process(makeJob({ userAgent: "Slackbot-LinkExpanding 1.0" }));

    expect(prisma.click.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isBot: true }),
    });
  });

  it("stores a null country when geo lookup finds nothing", async () => {
    vi.mocked(geoip.lookup).mockReturnValueOnce(null);

    await processor.process(makeJob());

    expect(prisma.click.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ country: null }),
    });
  });

  it('skips the geo lookup entirely for an "unknown" IP', async () => {
    await processor.process(makeJob({ ip: "unknown" }));

    expect(geoip.lookup).not.toHaveBeenCalled();
  });

  it("rethrows on a DB failure so BullMQ applies its retry policy", async () => {
    prisma.click.create.mockRejectedValueOnce(new Error("connection refused"));
    vi.mocked(geoip.lookup).mockReturnValueOnce(null);

    await expect(processor.process(makeJob())).rejects.toThrow("connection refused");
  });
});
