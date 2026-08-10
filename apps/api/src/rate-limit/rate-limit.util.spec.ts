import { describe, expect, it } from "vitest";
import { resolveRetryAfterSeconds } from "./rate-limit.util";

describe("resolveRetryAfterSeconds", () => {
  it("converts msBeforeNext to whole seconds, rounding up", () => {
    expect(resolveRetryAfterSeconds({ msBeforeNext: 4500 })).toBe(5);
    expect(resolveRetryAfterSeconds({ msBeforeNext: 1000 })).toBe(1);
    expect(resolveRetryAfterSeconds({ msBeforeNext: 100 })).toBe(1);
  });

  it("defaults to 1 second when the rejection carries no msBeforeNext", () => {
    expect(resolveRetryAfterSeconds({})).toBe(1);
    expect(resolveRetryAfterSeconds(null)).toBe(1);
    expect(resolveRetryAfterSeconds(undefined)).toBe(1);
    expect(resolveRetryAfterSeconds("some string rejection")).toBe(1);
  });
});
