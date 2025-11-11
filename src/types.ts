export const SCORE_CATEGORIES = [
  "FG",
  "FT",
  "3PTM",
  "PTS",
  "REB",
  "AST",
  "STL",
  "BLK",
  "TOV",
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export type PlayerSummary = {
  id: number;
  name: string;
  team: string | null;
  totalZ: number;
};

export type PlayerZScores = Record<ScoreCategory, number>;

export type RawStats = {
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

export type PlayerDetail = {
  id: number;
  name: string;
  team: string | null;
  totalZ: number;
  zscores: PlayerZScores;
};

export type PlayerProfile = PlayerDetail & {
  rawStats: RawStats | null;
};

export type PlayerDetailResponse = {
  player: PlayerDetail;
  rawStats: RawStats | null;
};

export type SimilarPlayer = {
  distance: number;
  player: PlayerDetail | null;
  rawStats: RawStats | null;
};

export type SimilarPlayersResponse = {
  player: PlayerProfile;
  similar: SimilarPlayer[];
  limit: number;
};

export type PlayerSearchResponse = {
  query: string;
  limit: number;
  results: PlayerSummary[];
};

export type RequestState = "idle" | "loading" | "success" | "error";
