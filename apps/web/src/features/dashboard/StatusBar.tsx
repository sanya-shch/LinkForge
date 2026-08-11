import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

export function StatusBar() {
  const { data } = useQuery({
    queryKey: ["links", "status-bar"],
    queryFn: () => api.listLinks(1, 1),
    refetchInterval: 30_000,
  });

  return (
    <div className="status-bar">
      <div className="status-bar__inner">
        <Link to="/" className="status-bar__brand">
          <span className="status-bar__dot" aria-hidden />
          linkforge
        </Link>
        <div className="status-bar__stats">
          <span>
            links <strong>{data?.total ?? "—"}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
