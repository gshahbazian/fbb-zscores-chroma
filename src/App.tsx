import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { PlayerSearch } from "./components/PlayerSearch";
import { PlayerProfilePanel } from "./components/PlayerProfilePanel";
import { SimilarPlayersPanel } from "./components/SimilarPlayersPanel";
import { ZScoreRadar } from "./components/ZScoreRadar";
import type {
  PlayerDetailResponse,
  PlayerProfile,
  PlayerSummary,
  RequestState,
  SimilarPlayer,
  SimilarPlayersResponse,
} from "./types";

export function App() {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(
    null,
  );
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<RequestState>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [similarPlayers, setSimilarPlayers] = useState<SimilarPlayer[]>([]);
  const [similarStatus, setSimilarStatus] = useState<RequestState>("idle");
  const [similarError, setSimilarError] = useState<string | null>(null);

  const comparisonSeries = useMemo(() => {
    const series: Array<{
      key: string;
      label: string;
      zscores: PlayerProfile["zscores"];
    }> = [];

    if (profile) {
      series.push({
        key: `player-${profile.id}`,
        label: profile.name,
        zscores: profile.zscores,
      });
    }

    similarPlayers.forEach((entry) => {
      if (!entry.player?.zscores) return;
      series.push({
        key: `similar-${entry.player.id}`,
        label: entry.player.name,
        zscores: entry.player.zscores,
      });
    });

    return series;
  }, [profile, similarPlayers]);

  useEffect(() => {
    if (!selectedPlayer) {
      setProfile(null);
      setProfileStatus("idle");
      setProfileError(null);
      setSimilarPlayers([]);
      setSimilarStatus("idle");
      setSimilarError(null);
      return;
    }

    const playerId = selectedPlayer.id;
    let active = true;
    const detailController = new AbortController();
    const similarController = new AbortController();

    setProfile(null);
    setProfileStatus("loading");
    setProfileError(null);
    setSimilarPlayers([]);
    setSimilarStatus("loading");
    setSimilarError(null);

    const loadDetails = async () => {
      try {
        const res = await fetch(`/api/players/${playerId}`, {
          signal: detailController.signal,
          headers: { Accept: "application/json" },
        });
        let parsed: unknown = null;
        try {
          parsed = await res.json();
        } catch (error) {
          if (res.ok) throw error;
        }

        if (!res.ok) {
          const message =
            typeof parsed === "object" && parsed && "error" in parsed
              ? (parsed as { error?: string }).error
              : res.statusText;
          throw new Error(message || "Failed to load player");
        }

        if (!active) return;
        const payload = parsed as PlayerDetailResponse;
        const nextProfile: PlayerProfile = {
          ...payload.player,
          rawStats: payload.rawStats,
        };
        setProfile(nextProfile);
        setProfileStatus("success");
      } catch (error) {
        if (!active || (error as Error).name === "AbortError") return;
        setProfileStatus("error");
        setProfileError((error as Error).message || "Failed to load player");
      }
    };

    const loadSimilar = async () => {
      try {
        const params = new URLSearchParams({ limit: "3" });
        const res = await fetch(
          `/api/players/${playerId}/similar?${params.toString()}`,
          {
            signal: similarController.signal,
            headers: { Accept: "application/json" },
          },
        );
        let parsed: unknown = null;
        try {
          parsed = await res.json();
        } catch (error) {
          if (res.ok) throw error;
        }

        if (!res.ok) {
          const message =
            typeof parsed === "object" && parsed && "error" in parsed
              ? (parsed as { error?: string }).error
              : res.statusText;
          throw new Error(message || "Failed to load similar players");
        }

        if (!active || !parsed) return;
        const payload = parsed as SimilarPlayersResponse;
        setSimilarPlayers(payload.similar);
        setSimilarStatus("success");
        setProfile(payload.player);
        setProfileStatus("success");
      } catch (error) {
        if (!active || (error as Error).name === "AbortError") return;
        setSimilarStatus("error");
        setSimilarError(
          (error as Error).message || "Failed to load similar players",
        );
      }
    };

    loadDetails();
    loadSimilar();

    return () => {
      active = false;
      detailController.abort();
      similarController.abort();
    };
  }, [selectedPlayer?.id]);

  return (
    <div className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">Fantasy tools</p>
          <h1>NBA Z-Score Explorer</h1>
          <p className="muted-text">
            Autocomplete any player to inspect their nine-category z-scores and
            surface the closest statistical neighbors.
          </p>
        </div>
        <PlayerSearch onSelect={setSelectedPlayer} />
      </header>

      <main className="dashboard-grid">
        <PlayerProfilePanel
          profile={profile}
          status={profileStatus}
          error={profileError}
          selectedName={selectedPlayer?.name}
        />
        <SimilarPlayersPanel
          similar={similarPlayers}
          status={similarStatus}
          error={similarError}
          anchorName={selectedPlayer?.name}
        />
      </main>

      <section className="panel radar-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Radar comparison</p>
            <h2>Z-score overlay</h2>
            <p className="muted-text">
              Compare the selected player against their three closest statistical comps.
            </p>
          </div>
        </header>
        {comparisonSeries.length ? (
          <div className="radar-card">
            <ZScoreRadar series={comparisonSeries} />
          </div>
        ) : (
          <p className="empty-text">Select a player to plot their profile.</p>
        )}
      </section>
    </div>
  );
}

export default App;
