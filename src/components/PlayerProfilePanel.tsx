import { SCORE_CATEGORIES, type PlayerProfile, type RequestState } from "../types";

type PlayerProfilePanelProps = {
  profile: PlayerProfile | null;
  status: RequestState;
  error: string | null;
  selectedName?: string;
};

const RAW_SUMMARY_FIELDS: Array<{
  key: keyof NonNullable<PlayerProfile["rawStats"]>;
  label: string;
  digits?: number;
  format?: (value: number | null | undefined) => string;
}> = [
  { key: "minutes", label: "MIN", digits: 1 },
  { key: "pts", label: "PTS", digits: 1 },
  { key: "reb", label: "REB", digits: 1 },
  { key: "ast", label: "AST", digits: 1 },
  { key: "stl", label: "STL", digits: 1 },
  { key: "blk", label: "BLK", digits: 1 },
  { key: "fg3m", label: "3PM", digits: 1 },
  { key: "fgPct", label: "FG%", format: formatPercent },
  { key: "ftPct", label: "FT%", format: formatPercent },
  { key: "tov", label: "TOV", digits: 1 },
];

export function PlayerProfilePanel({ profile, status, error, selectedName }: PlayerProfilePanelProps) {
  if (status === "idle") {
    return (
      <section className="panel profile-panel">
        <p className="empty-text">Search for a player to view their z-scores.</p>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="panel profile-panel">
        <div className="skeleton title" />
        <div className="skeleton line" />
        <div className="skeleton grid" />
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="panel profile-panel">
        <p className="error-text">{error ?? "Unable to load player"}</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="panel profile-panel">
        <p className="empty-text">No data available{selectedName ? ` for ${selectedName}` : ""}.</p>
      </section>
    );
  }

  return (
    <section className="panel profile-panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Selected player</p>
          <h2>
            {profile.name} <span className="team-tag">{profile.team ?? "FA"}</span>
          </h2>
        </div>
        <div className="total-z">
          <span>Total Z</span>
          <strong>{profile.totalZ.toFixed(2)}</strong>
        </div>
      </header>

      <div className="zscores-grid">
        {SCORE_CATEGORIES.map((category) => {
          const value = profile.zscores[category];
          return (
            <div className="zscore-card" key={category} data-positive={value >= 0}>
              <span className="label">{category}</span>
              <strong>{value?.toFixed(2)}</strong>
              <div className="z-bar">
                <div
                  className="z-bar-fill"
                  data-positive={value >= 0}
                  style={{ width: `${Math.min(Math.abs(value) / 4, 1) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="raw-stats">
        <h3>Raw stat snapshot</h3>
        {profile.rawStats ? (
          <dl className="raw-stats-grid">
            {RAW_SUMMARY_FIELDS.map(({ key, label, digits = 1, format }) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{format ? format(profile.rawStats?.[key]) : formatNumber(profile.rawStats?.[key], digits)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted-text">Raw stats unavailable for this player.</p>
        )}
      </div>
    </section>
  );
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(1)}%`;
}
