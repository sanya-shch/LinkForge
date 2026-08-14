import { expect, test } from "@playwright/test";

function randomAlias(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${suffix}`;
}

test.describe("Negative scenarios", () => {
  test("redirecting to a slug that was never created returns 404", async ({ request }) => {
    const res = await request.get("/this-slug-does-not-exist-e2e");
    expect(res.status()).toBe(404);
  });

  test("redirecting to an expired link returns 404, not a redirect", async ({ request }) => {
    const alias = randomAlias("e2e-expired");
    const createRes = await request.post("/links", {
      data: {
        originalUrl: "https://example.com",
        customAlias: alias,
        expiresAt: "2020-01-01T00:00:00.000Z",
      },
    });
    expect(createRes.status()).toBe(201);

    const res = await request.get(`/${alias}`, { maxRedirects: 0 });
    expect(res.status()).toBe(404);
  });

  test("creating a link with an already-taken custom alias returns 409", async ({ request }) => {
    const alias = randomAlias("e2e-taken");
    const setupRes = await request.post("/links", {
      data: { originalUrl: "https://a.example.com", customAlias: alias },
    });
    expect(setupRes.status()).toBe(201);

    const conflictRes = await request.post("/links", {
      data: { originalUrl: "https://b.example.com", customAlias: alias },
    });

    expect(conflictRes.status()).toBe(409);
  });

  test("two concurrent requests racing for the same new custom alias: exactly one gets 201, the other gets 409", async ({
    request,
  }) => {
    const alias = randomAlias("e2e-race");

    const [first, second] = await Promise.all([
      request.post("/links", {
        data: { originalUrl: "https://a.example.com", customAlias: alias },
      }),
      request.post("/links", {
        data: { originalUrl: "https://b.example.com", customAlias: alias },
      }),
    ]);

    const statuses = [first.status(), second.status()].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
  });

  test("exceeding the redirect rate limit for one slug returns 429 with a Retry-After header", async ({
    request,
  }) => {
    const alias = randomAlias("e2e-ratelimit");
    const setupRes = await request.post("/links", {
      data: { originalUrl: "https://example.com", customAlias: alias },
    });
    expect(setupRes.status()).toBe(201);

    let limited = null;

    for (let i = 0; i < 130; i++) {
      const res = await request.get(`/${alias}`, { maxRedirects: 0 });
      if (res.status() === 429) {
        limited = res;
        break;
      }
    }

    expect(limited).not.toBeNull();
    expect(limited!.headers()["retry-after"]).toBeTruthy();
  });

  test("exceeding the link-creation rate limit for one IP returns 429", async ({ request }) => {
    let limited = null;

    for (let i = 0; i < 15; i++) {
      const res = await request.post("/links", {
        data: { originalUrl: `https://example.com/${i}` },
      });
      if (res.status() === 429) {
        limited = res;
        break;
      }
    }

    expect(limited).not.toBeNull();
    expect(limited!.headers()["retry-after"]).toBeTruthy();
  });
});
