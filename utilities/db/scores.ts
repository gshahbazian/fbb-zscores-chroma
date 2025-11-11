import { Database } from "bun:sqlite";

import { SCORES_DB_PATH } from "@utilities/config";
import type {
  PlayerScoreRow,
  PlayerSearchResult,
  PlayerSummary,
} from "@utilities/types/player";

const scoresDb = new Database(SCORES_DB_PATH, { readonly: true });

type ScoreDbRow = Omit<PlayerScoreRow, "playerId" | "playerName"> & {
  playerId: number;
  playerName: string;
};

const PLAYER_SELECT = `
  player_id as playerId,
  player_name as playerName,
  team,
  fg_z as FG,
  ft_z as FT,
  three_ptm_z as "3PTM",
  pts_z as PTS,
  reb_z as REB,
  ast_z as AST,
  stl_z as STL,
  blk_z as BLK,
  tov_z as TOV,
  total_z as totalZ
`;

const SUMMARY_SELECT = `
  player_id as playerId,
  player_name as playerName,
  team,
  total_z as totalZ
`;

function mapScoreRow(row: ScoreDbRow): PlayerScoreRow {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    team: row.team,
    FG: Number(row.FG ?? 0),
    FT: Number(row.FT ?? 0),
    "3PTM": Number(row["3PTM"] ?? 0),
    PTS: Number(row.PTS ?? 0),
    REB: Number(row.REB ?? 0),
    AST: Number(row.AST ?? 0),
    STL: Number(row.STL ?? 0),
    BLK: Number(row.BLK ?? 0),
    TOV: Number(row.TOV ?? 0),
    totalZ: Number(row.totalZ ?? 0),
  };
}

function mapSummaryRow(row: PlayerSummary): PlayerSearchResult {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    team: row.team,
    totalZ: Number(row.totalZ ?? 0),
  };
}

function buildPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

export function getPlayerById(playerId: number): PlayerScoreRow | null {
  const stmt = scoresDb.query(
    `SELECT ${PLAYER_SELECT}
     FROM player_scores
     WHERE player_id = ?
     LIMIT 1;`,
  );
  const row = stmt.get(playerId) as ScoreDbRow | undefined;
  return row ? mapScoreRow(row) : null;
}

export function getPlayersByIds(ids: number[]): PlayerScoreRow[] {
  if (!ids.length) return [];
  const placeholders = buildPlaceholders(ids.length);
  const stmt = scoresDb.query(
    `SELECT ${PLAYER_SELECT}
     FROM player_scores
     WHERE player_id IN (${placeholders});`,
  );
  const rows = stmt.all(...ids) as ScoreDbRow[];
  return rows.map(mapScoreRow);
}

export function searchPlayers(
  query: string,
  limit: number,
): PlayerSearchResult[] {
  const trimmed = query.trim();
  const likeValue = `%${trimmed}%`;
  const whereClause = trimmed
    ? `WHERE player_name LIKE ? COLLATE NOCASE`
    : "";

  const stmt = scoresDb.query(
    `SELECT ${SUMMARY_SELECT}
     FROM player_scores
     ${whereClause}
     ORDER BY total_z DESC
     LIMIT ?;`,
  );

  const rows = trimmed
    ? (stmt.all(likeValue, limit) as PlayerSummary[])
    : (stmt.all(limit) as PlayerSummary[]);

  return rows.map(mapSummaryRow);
}
