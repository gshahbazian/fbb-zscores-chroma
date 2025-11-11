import { Database } from "bun:sqlite";

import { RAW_STATS_DB_PATH } from "@utilities/config";
import type { RawStatsMap, RawStatsRow } from "@utilities/types/player";

const rawDb = new Database(RAW_STATS_DB_PATH, { readonly: true });

const RAW_SELECT = `
  PLAYER_ID as playerId,
  PLAYER_NAME as playerName,
  TEAM_ABBREVIATION as team,
  MIN as minutes,
  FGM as fgm,
  FGA as fga,
  FG_PCT as fgPct,
  FG3M as fg3m,
  FG3A as fg3a,
  FG3_PCT as fg3Pct,
  FTM as ftm,
  FTA as fta,
  FT_PCT as ftPct,
  REB as reb,
  AST as ast,
  STL as stl,
  BLK as blk,
  TOV as tov,
  PTS as pts
`;

type RawDbRow = RawStatsRow;

function buildPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

export function getRawStatsByIds(ids: number[]): RawStatsMap {
  if (!ids.length) return {};
  const placeholders = buildPlaceholders(ids.length);
  const stmt = rawDb.query(
    `SELECT ${RAW_SELECT}
     FROM nba_stats
     WHERE PLAYER_ID IN (${placeholders});`,
  );
  const rows = stmt.all(...ids) as RawDbRow[];
  return rows.reduce<RawStatsMap>((acc, row) => {
    acc[row.playerId] = {
      ...row,
      minutes: Number(row.minutes ?? 0),
      fgm: Number(row.fgm ?? 0),
      fga: Number(row.fga ?? 0),
      fgPct: Number(row.fgPct ?? 0),
      fg3m: Number(row.fg3m ?? 0),
      fg3a: Number(row.fg3a ?? 0),
      fg3Pct: Number(row.fg3Pct ?? 0),
      ftm: Number(row.ftm ?? 0),
      fta: Number(row.fta ?? 0),
      ftPct: Number(row.ftPct ?? 0),
      reb: Number(row.reb ?? 0),
      ast: Number(row.ast ?? 0),
      stl: Number(row.stl ?? 0),
      blk: Number(row.blk ?? 0),
      tov: Number(row.tov ?? 0),
      pts: Number(row.pts ?? 0),
    };
    return acc;
  }, {});
}
