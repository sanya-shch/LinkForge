import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { ClickLogEntry } from "../../api/client";

const ROW_HEIGHT = 34;

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ClickLogVirtualList({ clicks }: { clicks: ClickLogEntry[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: clicks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (clicks.length === 0) {
    return (
      <div className="card empty-state">
        <div className="empty-state__title">No clicks recorded yet</div>
        <div>Share this link to start seeing activity here.</div>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className="card">
      <div ref={parentRef} className="click-log">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {items.map((virtualRow) => {
            const click = clicks[virtualRow.index];
            return (
              <div
                key={click.id}
                className="click-row"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <span className="click-row__time">{formatTimestamp(click.timestamp)}</span>
                <span className="click-row__browser">{click.browser ?? "—"}</span>
                <span className="click-row__os">{click.os ?? "—"}</span>
                <span className="click-row__country">{click.country ?? "—"}</span>
                <span className="click-row__bot">
                  {click.isBot ? (
                    <span className="badge badge--bot">bot</span>
                  ) : (
                    <span className="badge badge--human">human</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
