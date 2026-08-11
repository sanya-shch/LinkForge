const API_BASE = "/api";

export interface Link {
  slug: string;
  shortUrl: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface PaginatedLinks {
  items: Link[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsSummary {
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  byCountry: Array<{ country: string | null; count: number }>;
  byBrowser: Array<{ browser: string | null; count: number }>;
  byDay: Array<{ day: string; count: number }>;
}

export interface ClickLogEntry {
  id: string;
  timestamp: string;
  country: string | null;
  browser: string | null;
  os: string | null;
  isBot: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed with ${res.status}`);
  }

  return res.json();
}

export const api = {
  listLinks: (page: number, limit = 20) =>
    request<PaginatedLinks>(`/links?page=${page}&limit=${limit}`),

  createLink: (data: { originalUrl: string; customAlias?: string; expiresAt?: string }) =>
    request<Link>("/links", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAnalytics: (slug: string) => request<AnalyticsSummary>(`/links/${slug}/analytics`),

  getClicks: (slug: string) => request<ClickLogEntry[]>(`/links/${slug}/clicks`),

  qrUrl: (slug: string, format: "png" | "svg" = "png") =>
    `${API_BASE}/links/${slug}/qr?format=${format}`,
};
