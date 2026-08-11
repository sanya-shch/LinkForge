import type { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpirationSchedulerService } from "./expiration-scheduler.service";

describe("ExpirationSchedulerService", () => {
  let queue: {
    getRepeatableJobs: ReturnType<typeof vi.fn>;
    removeRepeatableByKey: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
  let config: { get: ReturnType<typeof vi.fn> };
  let service: ExpirationSchedulerService;

  beforeEach(() => {
    queue = {
      getRepeatableJobs: vi.fn().mockResolvedValue([]),
      removeRepeatableByKey: vi.fn(),
      add: vi.fn(),
    };
    config = { get: vi.fn((_key: string, fallback: number) => fallback) };
    service = new ExpirationSchedulerService(
      queue as unknown as Queue,
      config as unknown as ConfigService,
    );
  });

  it("schedules the repeatable job using the configured interval", async () => {
    config.get.mockReturnValueOnce(10);

    await service.ensureScheduled();

    expect(queue.add).toHaveBeenCalledWith(
      "expire-links",
      {},
      { repeat: { every: 10 * 60 * 1000 } },
    );
  });

  it("falls back to a 5-minute default interval when unset", async () => {
    await service.ensureScheduled();

    expect(queue.add).toHaveBeenCalledWith(
      "expire-links",
      {},
      { repeat: { every: 5 * 60 * 1000 } },
    );
  });

  it("removes any pre-existing schedule for this job before adding a fresh one", async () => {
    queue.getRepeatableJobs.mockResolvedValueOnce([
      { name: "expire-links", key: "old-key-1" },
      { name: "some-other-job", key: "unrelated-key" },
    ]);

    await service.ensureScheduled();

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith("old-key-1");
    expect(queue.removeRepeatableByKey).not.toHaveBeenCalledWith("unrelated-key");
    expect(queue.removeRepeatableByKey).toHaveBeenCalledTimes(1);
  });

  it("does not touch repeatable jobs belonging to other job names", async () => {
    queue.getRepeatableJobs.mockResolvedValueOnce([
      { name: "some-other-job", key: "unrelated-key" },
    ]);

    await service.ensureScheduled();

    expect(queue.removeRepeatableByKey).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
