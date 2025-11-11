type NBAApiResponse = {
  resultSets: {
    name: string
    headers: string[]
    rowSet: (string | number | null)[][]
  }[]
}

const headerKeys = [
  "PLAYER_ID",
  "PLAYER_NAME",
  "NICKNAME",
  "TEAM_ID",
  "TEAM_ABBREVIATION",
  "AGE",
  "GP",
  "W",
  "L",
  "W_PCT",
  "MIN",
  "FGM",
  "FGA",
  "FG_PCT",
  "FG3M",
  "FG3A",
  "FG3_PCT",
  "FTM",
  "FTA",
  "FT_PCT",
  "OREB",
  "DREB",
  "REB",
  "AST",
  "TOV",
  "STL",
  "BLK",
  "BLKA",
  "PF",
  "PFD",
  "PTS",
  "PLUS_MINUS",
  "NBA_FANTASY_PTS",
  "DD2",
  "TD3",
  "WNBA_FANTASY_PTS",
  "GP_RANK",
  "W_RANK",
  "L_RANK",
  "W_PCT_RANK",
  "MIN_RANK",
  "FGM_RANK",
  "FGA_RANK",
  "FG_PCT_RANK",
  "FG3M_RANK",
  "FG3A_RANK",
  "FG3_PCT_RANK",
  "FTM_RANK",
  "FTA_RANK",
  "FT_PCT_RANK",
  "OREB_RANK",
  "DREB_RANK",
  "REB_RANK",
  "AST_RANK",
  "TOV_RANK",
  "STL_RANK",
  "BLK_RANK",
  "BLKA_RANK",
  "PF_RANK",
  "PFD_RANK",
  "PTS_RANK",
  "PLUS_MINUS_RANK",
  "NBA_FANTASY_PTS_RANK",
  "DD2_RANK",
  "TD3_RANK",
  "WNBA_FANTASY_PTS_RANK",
  "TEAM_COUNT"
] as const;

export type ParsedRow = Record<string, string | number | null>

/**
 * Parses an NBA stats API response into an array of readable player objects.
 */
export function parseNBAStats(response: NBAApiResponse): ParsedRow[] {
  const resultSet = response.resultSets[0]
  if (!resultSet) return []

  const { rowSet } = resultSet

  // Map each row to an object using either the friendly name or the raw header
  return rowSet.map((row) => {
    const obj: ParsedRow = {}
    headerKeys.forEach((key, i) => {
      obj[key] = row[i] ?? null
    })
    return obj
  })
}
