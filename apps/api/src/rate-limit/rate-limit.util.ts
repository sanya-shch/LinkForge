export function resolveRetryAfterSeconds(rejection: unknown): number {
  if (
    rejection &&
    typeof rejection === "object" &&
    "msBeforeNext" in rejection &&
    typeof (rejection as { msBeforeNext: unknown }).msBeforeNext === "number"
  ) {
    const ms = (rejection as { msBeforeNext: number }).msBeforeNext;
    return Math.max(1, Math.ceil(ms / 1000));
  }

  return 1;
}
