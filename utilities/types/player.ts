import type { EmbeddingKey } from "@utilities/config";

export type PlayerZScores = Record<EmbeddingKey, number>;

export type PlayerScoreRow = PlayerZScores & {
  playerId: number;
  playerName: string;
  team: string | null;
  totalZ: number;
};

export type PlayerSummary = {
  playerId: number;
  playerName: string;
  team: string | null;
  totalZ: number;
};

export type PlayerSearchResult = PlayerSummary;

export type PlayerDetail = {
  id: number;
  name: string;
  team: string | null;
  totalZ: number;
  zscores: PlayerZScores;
};

export type RawStatsRow = {
  playerId: number;
  playerName: string;
  team: string | null;
  minutes: number;
  fgm: number;
  fga: number;
  fgPct: number;
  fg3m: number;
  fg3a: number;
  fg3Pct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  pts: number;
};

export type RawStatsMap = Record<number, RawStatsRow | undefined>;
