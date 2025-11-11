import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { parseNBAStats, type ParsedRow } from "scripts/nba";

function inferColumnTypes(rows: ParsedRow[]): Record<string, string> {
  const types: Record<string, string> = {};

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;

      if (typeof value === "string") {
        // once TEXT, always TEXT
        types[key] = "TEXT";
      } else if (typeof value === "number") {
        types[key] = "REAL";
      } else {
        // fallback
        types[key] = "TEXT";
      }
    }
  }

  // any keys that were always null → TEXT
  const sample = rows[0]!;
  for (const key of Object.keys(sample)) {
    if (!types[key]) {
      types[key] = "TEXT";
    }
  }

  return types;
}

await mkdir("out", { recursive: true });
await Bun.file("out/data.sqlite").delete();

const db = new Database("out/data.sqlite", { create: true });

// note the nba api is very finicky about these headers
const res = await fetch("https://stats.nba.com/stats/leaguedashplayerstats?College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=&GameScope=&GameSegment=&Height=&ISTRound=&LastNGames=0&LeagueID=00&Location=&MeasureType=Base&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=PerGame&Period=0&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season=2024-25&SeasonSegment=&SeasonType=Regular%20Season&ShotClockRange=&StarterBench=&TeamID=0&VsConference=&VsDivision=&Weight=", {
  headers: {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Origin': 'https://www.nba.com',
    'Referer': 'https://www.nba.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  },
});
const json = await res.json();
const stats = parseNBAStats(json);

if (!stats.length) throw new Error("No stats found");

const columnTypes = inferColumnTypes(stats);

const sample = stats[0]!;
const columns = Object.keys(sample).map((label) => ({
  col: label,
  type: columnTypes[label] ?? "TEXT",
}));

db.run(`DROP TABLE IF EXISTS nba_stats;`);

const columnsSql = columns
  .map((c) => `"${c.col}" ${c.type}`)
  .join(", ");

db.run(`
    CREATE TABLE IF NOT EXISTS nba_stats (
      ${columnsSql}
    );
  `);

const colNames = columns.map((c) => `"${c.col}"`).join(", ");
const placeholders = columns.map(() => "?").join(", ");

const insert = db.prepare(
  `INSERT INTO nba_stats (${colNames}) VALUES (${placeholders});`
);

const insertMany = db.transaction((rows: ParsedRow[]) => {
  for (const row of rows) {
    const values = columns.map((c) => {
      return row[c.col] ?? null;
    });
    insert.run(...values);
  }
});

insertMany(stats);
