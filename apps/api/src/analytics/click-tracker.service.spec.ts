import type { Request } from "express";
import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClickTrackerService } from "./click-tracker.service";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    ip: "1.2.3.4",
    headers: { "user-agent": "Mozilla/5.0 (test)" },
    ...overrides,
  } as unknown as Request;
}

describe("ClickTrackerService", () => {
  let queue: { add: ReturnType<typeof vi.fn> };
  let service: ClickTrackerService;

  beforeEach(() => {
    queue = { add: vi.fn().mockResolvedValue(undefined) };
    service = new ClickTrackerService(queue as unknown as Queue);
  });

  it("enqueues a click job with the request IP and User-Agent", async () => {
    await service.track("link-1", makeReq());

    expect(queue.add).toHaveBeenCalledWith(
      "record-click",
      expect.objectContaining({
        linkId: "link-1",
        ip: "1.2.3.4",
        userAgent: "Mozilla/5.0 (test)",
      }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('falls back to "unknown" when the request has no IP', async () => {
    await service.track("link-1", makeReq({ ip: undefined }));

    expect(queue.add).toHaveBeenCalledWith(
      "record-click",
      expect.objectContaining({ ip: "unknown" }),
      expect.anything(),
    );
  });

  it("never throws when the queue itself fails - the redirect must not depend on it", async () => {
    queue.add.mockRejectedValueOnce(new Error("redis unavailable"));

    await expect(service.track("link-1", makeReq())).resolves.toBeUndefined();
  });
});
