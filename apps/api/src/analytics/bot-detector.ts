const BOT_PATTERNS: RegExp[] = [
  /slackbot/i,
  /telegrambot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /discordbot/i,
  /whatsapp/i,
  /linkedinbot/i,
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /duckduckbot/i,
  /ia_archiver/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /bot|crawler|spider|preview/i,
];

export function isBotUserAgent(userAgent: string | undefined | null): boolean {
  if (!userAgent || userAgent.trim().length === 0) {
    return true;
  }

  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
