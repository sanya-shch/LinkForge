import { expect, test } from "@playwright/test";

function randomAlias(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${suffix}`;
}

test.describe("Happy path: create -> redirect -> analytics", () => {
  test("creates a link, redirects to its destination, and the click shows up in analytics", async ({
    request,
  }) => {
    const alias = randomAlias("e2e-happy");

    const createRes = await request.post("/links", {
      data: { originalUrl: "https://example.com", customAlias: alias },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.slug).toBe(alias);
    expect(created.shortUrl).toContain(alias);

    const redirectRes = await request.get(`/${alias}`, { maxRedirects: 0 });
    expect(redirectRes.status()).toBe(302);
    expect(redirectRes.headers()["location"]).toBe("https://example.com");

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const analyticsRes = await request.get(`/links/${alias}/analytics`);
    expect(analyticsRes.status()).toBe(200);
    const analytics = await analyticsRes.json();
    expect(analytics.totalClicks).toBeGreaterThanOrEqual(1);
  });

  test("generates a scannable QR code for a created link", async ({ request }) => {
    const alias = randomAlias("e2e-qr");
    const createRes = await request.post("/links", {
      data: { originalUrl: "https://example.com", customAlias: alias },
    });
    expect(createRes.status()).toBe(201);

    const qrRes = await request.get(`/links/${alias}/qr`);
    expect(qrRes.status()).toBe(200);
    expect(qrRes.headers()["content-type"]).toBe("image/png");

    const body = await qrRes.body();

    expect(body.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });
});
