import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { api } from "../../api/client";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="icon-button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? <span className="copy-flash">copied</span> : "copy"}
    </button>
  );
}

export function LinksList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["links", page],
    queryFn: () => api.listLinks(page, 20),
    placeholderData: (prev) => prev,
  });

  if (isLoading) {
    return <div className="spinner-text">loading links…</div>;
  }

  if (isError) {
    return <div className="form-error">{(error as Error).message}</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="card empty-state">
        <div className="empty-state__title">No links yet</div>
        <div>Create your first short link above.</div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        {data.items.map((link) => (
          <div className="link-row" key={link.slug}>
            <span
              className={`link-status-dot ${
                link.isActive ? "link-status-dot--active" : "link-status-dot--inactive"
              }`}
              aria-hidden
            />
            <div className="link-row__main">
              <RouterLink to={`/links/${link.slug}`} className="link-row__slug">
                {link.slug}
              </RouterLink>
              <div className="link-row__url">{link.originalUrl}</div>
            </div>
            <div className="link-row__meta">{formatDate(link.createdAt)}</div>
            <div className="link-row__actions">
              <CopyButton text={link.shortUrl} />
              <RouterLink to={`/links/${link.slug}`} className="icon-button">
                stats
              </RouterLink>
            </div>
          </div>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="pagination">
          <button
            className="button button--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← prev
          </button>
          <span>
            page {data.page} / {data.totalPages}
          </span>
          <button
            className="button button--ghost"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            next →
          </button>
        </div>
      )}
    </>
  );
}
