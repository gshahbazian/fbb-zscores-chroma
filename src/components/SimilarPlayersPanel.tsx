import { SCORE_CATEGORIES, type RequestState, type SimilarPlayer } from "../types";

type SimilarPlayersPanelProps = {
  similar: SimilarPlayer[];
  status: RequestState;
  error: string | null;
  anchorName?: string;
};

const RAW_FIELDS: Array<keyof NonNullable<SimilarPlayer["rawStats"]>> = [
  "pts",
  "reb",
  "ast",
  "stl",
  "blk",
  "fg3m",
  "tov",
];

export function SimilarPlayersPanel({ similar, status, error, anchorName }: SimilarPlayersPanelProps) {
  if (status === "idle") {
    return (
      <section className="panel similar-panel">
        <p className="empty-text">Compare players to see comps.</p>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="panel similar-panel">
        <div className="skeleton title" />
        <div className="skeleton card" />
        <div className="skeleton card" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel similar-panel">
        <p className="error-text">{error ?? "Unable to load similar players"}</p>
      </section>
    );
  }

  if (!similar.length) {
    return (
      <section className="panel similar-panel">
        <p className="empty-text">No similar players found{anchorName ? ` for ${anchorName}` : ""}.</p>
      </section>
    );
  }

  return (
    <section className="panel similar-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Similarity search</p>
          <h2>Closest player comps</h2>
          {anchorName && <p className="muted-text">Compared against {anchorName}&rsquo;s z-score profile.</p>}
        </div>
      </header>
      <div className="similar-grid">
        {similar.map((entry) => {
          const displayName = entry.player?.name ?? entry.rawStats?.playerName ?? "Unknown";
          const team = entry.player?.team ?? entry.rawStats?.team ?? "—";
          const zscores = entry.player?.zscores;
          const totalZ = entry.player?.totalZ ?? null;
          return (
            <article key={`${displayName}-${entry.distance}`} className="similar-card">
              <div className="similar-card-header">
                <div>
                  <p className="eyebrow">Distance {entry.distance.toFixed(3)}</p>
                  <h3>{displayName}</h3>
                  <p className="muted-text">{team}</p>
                </div>
                {totalZ !== null && (
                  <div className="total-z small">
                    <span>Total Z</span>
                    <strong>{totalZ.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {zscores ? (
                <div className="mini-zscores">
                  {SCORE_CATEGORIES.map((category) => (
                    <div key={category} className="mini-zscore" data-positive={(zscores?.[category] ?? 0) >= 0}>
                      <span>{category}</span>
                      <strong>{zscores?.[category]?.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">Z-scores not available.</p>
              )}

              <div className="mini-raw-stats">
                {entry.rawStats ? (
                  RAW_FIELDS.map((field) => (
                    <div key={field}>
                      <span>{field.toUpperCase()}</span>
                      <strong>{formatNumber(entry.rawStats?.[field])}</strong>
                    </div>
                  ))
                ) : (
                  <p className="muted-text">Raw stats unavailable.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}
