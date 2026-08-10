import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "./bot-detector";

describe("isBotUserAgent", () => {
  it("flags known link-preview crawlers", () => {
    expect(isBotUserAgent("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBotUserAgent("TelegramBot (like TwitterBot)")).toBe(true);
    expect(
      isBotUserAgent("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"),
    ).toBe(true);
    expect(
      isBotUserAgent("Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"),
    ).toBe(true);
  });

  it("flags known search engine crawlers", () => {
    expect(
      isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    ).toBe(true);
    expect(
      isBotUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"),
    ).toBe(true);
  });

  it("flags generic bot/crawler/spider substrings as a fallback", () => {
    expect(isBotUserAgent("SomeRandomCrawler/1.0")).toBe(true);
    expect(isBotUserAgent("CustomSpider")).toBe(true);
  });

  it("does not flag a real desktop browser", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe(false);
  });

  it("does not flag a real mobile browser", () => {
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(false);
  });

  it("treats a missing or empty User-Agent as suspicious", () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent("   ")).toBe(true);
  });
});
