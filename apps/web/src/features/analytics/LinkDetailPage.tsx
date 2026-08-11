import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { ClickLogVirtualList } from "./ClickLogVirtualList";

export function LinkDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  const analyticsQuery = useQuery({
    queryKey: ["analytics", slug],
    queryFn: () => api.getAnalytics(slug),
    refetchInterval: 15_000,
  });

  const clicksQuery = useQuery({
    queryKey: ["clicks", slug],
    queryFn: () => api.getClicks(slug),
    refetchInterval: 15_000,
  });

  return (
    <div className="page container">
      <Link to="/" className="back-link">
        ← all links
      </Link>

      <div className="page__header">
        <div>
          <h1 className="page__title mono">[{slug}]</h1>
          <div className="page__subtitle">link analytics</div>
        </div>
        <img
          src={api.qrUrl(slug)}
          alt={`QR code for ${slug}`}
          width={72}
          height={72}
          style={{ borderRadius: 6, border: "1px solid var(--border)" }}
        />
      </div>

      {analyticsQuery.isLoading && <div className="spinner-text">loading analytics…</div>}
      {analyticsQuery.isError && (
        <div className="form-error">{(analyticsQuery.error as Error).message}</div>
      )}
      {analyticsQuery.data && <AnalyticsCharts summary={analyticsQuery.data} />}

      <div className="section-title">Recent activity</div>
      {clicksQuery.isLoading && <div className="spinner-text">loading clicks…</div>}
      {clicksQuery.isError && (
        <div className="form-error">{(clicksQuery.error as Error).message}</div>
      )}
      {clicksQuery.data && <ClickLogVirtualList clicks={clicksQuery.data} />}
    </div>
  );
}
