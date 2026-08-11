import { describe, expect, it } from "vitest";
import { QrService } from "./qr.service";

describe("QrService", () => {
  const service = new QrService();

  it("generates a PNG buffer with a valid PNG signature", async () => {
    const result = await service.generate("https://example.com/abc123", "png");

    expect(Buffer.isBuffer(result)).toBe(true);
    const buffer = result as Buffer;
    expect(buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it("generates an SVG string containing an <svg> element", async () => {
    const result = await service.generate("https://example.com/abc123", "svg");

    expect(typeof result).toBe("string");
    expect(result as string).toContain("<svg");
  });

  it("produces different output for different input URLs", async () => {
    const a = await service.generate("https://example.com/aaa", "svg");
    const b = await service.generate("https://example.com/bbb", "svg");

    expect(a).not.toEqual(b);
  });
});
