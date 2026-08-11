import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/client";

export function CreateLinkForm() {
  const queryClient = useQueryClient();
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.createLink({
        originalUrl,
        customAlias: customAlias.trim() || undefined,
      }),
    onSuccess: () => {
      setOriginalUrl("");
      setCustomAlias("");
      queryClient.invalidateQueries({ queryKey: ["links"] });
    },
  });

  return (
    <div className="card" style={{ padding: 18 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="form-row">
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="originalUrl">Destination URL</label>
            <input
              id="originalUrl"
              className="input"
              type="url"
              placeholder="https://example.com/some/long/path"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="customAlias">Custom alias (optional)</label>
            <input
              id="customAlias"
              className="input mono"
              type="text"
              placeholder="my-link"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Shorten"}
            </button>
          </div>
        </div>
      </form>
      {mutation.isError && <p className="form-error">{(mutation.error as Error).message}</p>}
    </div>
  );
}
