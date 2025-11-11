import { Database } from "bun:sqlite";

type NbaRow = {
  PLAYER_ID: number;
  PLAYER_NAME: string;
  TEAM_ABBREVIATION: string | null;
  FGM: number;
  FGA: number;
  FG_PCT: number;
  FTM: number;
  FTA: number;
  FT_PCT: number;
  FG3M: number;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TOV: number;
};

type LeagueStats = {
  players: NbaRow[];

  // basic means/stds for counting cats
  meanFG3M: number;
  stdFG3M: number;

  meanPTS: number;
  stdPTS: number;

  meanREB: number;
  stdREB: number;

  meanAST: number;
  stdAST: number;

  meanSTL: number;
  stdSTL: number;

  meanBLK: number;
  stdBLK: number;

  meanTOV: number;
  stdTOV: number;

  // shooting aggregates
  totalFGM: number;
  totalFGA: number;
  leagueFGPct: number;

  totalFTM: number;
  totalFTA: number;
  leagueFTPct: number;

  // for impact-style FG and FT we store the mean/std of "contribution"
  meanFGImpact: number;
  stdFGImpact: number;

  meanFTImpact: number;
  stdFTImpact: number;
};

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildLeagueStats(players: NbaRow[]): LeagueStats {
  // counting stats
  const fg3mArr = players.map((p) => p.FG3M);
  const ptsArr = players.map((p) => p.PTS);
  const rebArr = players.map((p) => p.REB);
  const astArr = players.map((p) => p.AST);
  const stlArr = players.map((p) => p.STL);
  const blkArr = players.map((p) => p.BLK);
  const tovArr = players.map((p) => p.TOV);

  // shooting totals
  const totalFGM = players.reduce((sum, p) => sum + (p.FGM ?? 0), 0);
  const totalFGA = players.reduce((sum, p) => sum + (p.FGA ?? 0), 0);
  const leagueFGPct = totalFGA > 0 ? totalFGM / totalFGA : 0;

  const totalFTM = players.reduce((sum, p) => sum + (p.FTM ?? 0), 0);
  const totalFTA = players.reduce((sum, p) => sum + (p.FTA ?? 0), 0);
  const leagueFTPct = totalFTA > 0 ? totalFTM / totalFTA : 0;

  // impact-style lists:
  // FG impact = how many FGs above/below an average shooter you provided, given your volume
  //    fgImpact = FGM - (leagueFGPct * FGA)
  const fgImpactArr = players.map(
    (p) => (p.FGM ?? 0) - leagueFGPct * (p.FGA ?? 0),
  );
  const ftImpactArr = players.map(
    (p) => (p.FTM ?? 0) - leagueFTPct * (p.FTA ?? 0),
  );

  return {
    players,

    meanFG3M: avg(fg3mArr),
    stdFG3M: stddev(fg3mArr),

    meanPTS: avg(ptsArr),
    stdPTS: stddev(ptsArr),

    meanREB: avg(rebArr),
    stdREB: stddev(rebArr),

    meanAST: avg(astArr),
    stdAST: stddev(astArr),

    meanSTL: avg(stlArr),
    stdSTL: stddev(stlArr),

    meanBLK: avg(blkArr),
    stdBLK: stddev(blkArr),

    meanTOV: avg(tovArr),
    stdTOV: stddev(tovArr),

    totalFGM,
    totalFGA,
    leagueFGPct,

    totalFTM,
    totalFTA,
    leagueFTPct,

    meanFGImpact: avg(fgImpactArr),
    stdFGImpact: stddev(fgImpactArr),

    meanFTImpact: avg(ftImpactArr),
    stdFTImpact: stddev(ftImpactArr),
  };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Z-score for a single player across 9 categories.
// Returns an object keyed by the common 9-cat names.
function getPlayerZScores(player: NbaRow, league: LeagueStats) {
  const {
    leagueFGPct,
    meanFGImpact,
    stdFGImpact,
    leagueFTPct,
    meanFTImpact,
    stdFTImpact,
  } = league;

  // 1) FG% (impact)
  // if std is 0 (all same), just return 0
  const fgImpact =
    (player.FGM ?? 0) - leagueFGPct * (player.FGA ?? 0); // how many makes above an average shooter, given your attempts
  const fgZ =
    stdFGImpact > 0 ? (fgImpact - meanFGImpact) / stdFGImpact : 0;

  // 2) FT% (impact)
  const ftImpact =
    (player.FTM ?? 0) - leagueFTPct * (player.FTA ?? 0);
  const ftZ =
    stdFTImpact > 0 ? (ftImpact - meanFTImpact) / stdFTImpact : 0;

  // 3) 3PTM
  const fg3mZ =
    league.stdFG3M > 0
      ? (player.FG3M - league.meanFG3M) / league.stdFG3M
      : 0;

  // 4) PTS
  const ptsZ =
    league.stdPTS > 0 ? (player.PTS - league.meanPTS) / league.stdPTS : 0;

  // 5) REB
  const rebZ =
    league.stdREB > 0 ? (player.REB - league.meanREB) / league.stdREB : 0;

  // 6) AST
  const astZ =
    league.stdAST > 0 ? (player.AST - league.meanAST) / league.stdAST : 0;

  // 7) STL
  const stlZ =
    league.stdSTL > 0 ? (player.STL - league.meanSTL) / league.stdSTL : 0;

  // 8) BLK
  const blkZ =
    league.stdBLK > 0 ? (player.BLK - league.meanBLK) / league.stdBLK : 0;

  // 9) TOV (lower is better → invert)
  const tovZRaw =
    league.stdTOV > 0 ? (player.TOV - league.meanTOV) / league.stdTOV : 0;
  const tovZ = -tovZRaw;

  return {
    FG: fgZ,
    FT: ftZ,
    "3PTM": fg3mZ,
    PTS: ptsZ,
    REB: rebZ,
    AST: astZ,
    STL: stlZ,
    BLK: blkZ,
    TOV: tovZ,
  };
}

async function main() {
  const db = new Database("out/data.sqlite", { readonly: true });

  // grab the top 200 by NBA_FANTASY_PTS
  const rows = db
    .query(
      `
      SELECT 
        PLAYER_ID,
        PLAYER_NAME,
        TEAM_ABBREVIATION,
        FGM, FGA, FG_PCT,
        FTM, FTA, FT_PCT,
        FG3M,
        PTS,
        REB,
        AST,
        STL,
        BLK,
        TOV
      FROM nba_stats
      ORDER BY NBA_FANTASY_PTS DESC
      LIMIT 200;
    `,
    )
    .all() as any[];

  const players: NbaRow[] = rows.map((r) => ({
    PLAYER_ID: Number(r.PLAYER_ID),
    PLAYER_NAME: r.PLAYER_NAME,
    TEAM_ABBREVIATION: r.TEAM_ABBREVIATION,
    FGM: Number(r.FGM ?? 0),
    FGA: Number(r.FGA ?? 0),
    FG_PCT: Number(r.FG_PCT ?? 0),
    FTM: Number(r.FTM ?? 0),
    FTA: Number(r.FTA ?? 0),
    FT_PCT: Number(r.FT_PCT ?? 0),
    FG3M: Number(r.FG3M ?? 0),
    PTS: Number(r.PTS ?? 0),
    REB: Number(r.REB ?? 0),
    AST: Number(r.AST ?? 0),
    STL: Number(r.STL ?? 0),
    BLK: Number(r.BLK ?? 0),
    TOV: Number(r.TOV ?? 0),
  }));

  const leagueStats = buildLeagueStats(players);

  // example: compute z-scores for first player
  const first = players[0]!;
  const z = getPlayerZScores(first, leagueStats);

  console.log("First player:", first.PLAYER_NAME);
  console.log("Z-scores:", z);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
