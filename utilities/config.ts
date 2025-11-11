export const SCORES_DB_PATH =
  process.env.SCORES_DB_PATH ?? "out/scores.sqlite";
export const RAW_STATS_DB_PATH =
  process.env.RAW_STATS_DB_PATH ?? "out/data.sqlite";

export const CHROMA_HOST = process.env.CHROMA_HOST ?? "localhost";
export const CHROMA_PORT = Number(process.env.CHROMA_PORT ?? "8000");
export const CHROMA_COLLECTION_NAME =
  process.env.CHROMA_COLLECTION_NAME ?? "scores";

export const DEFAULT_AUTOCOMPLETE_LIMIT = 10;
export const MAX_AUTOCOMPLETE_LIMIT = 25;
export const DEFAULT_SIMILAR_RESULTS = 3;
export const MAX_SIMILAR_RESULTS = 10;

export const EMBEDDING_ORDER = [
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

export type EmbeddingKey = (typeof EMBEDDING_ORDER)[number];
