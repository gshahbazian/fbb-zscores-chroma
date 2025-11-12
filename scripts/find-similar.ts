import { ChromaClient } from "chromadb";
import { Database } from "bun:sqlite";
import { createManualEmbeddingInstance } from "@utilities/lib/manual-embedding";

const CHROMA_HOST = "localhost";
const CHROMA_PORT = 8000;
const COLLECTION_NAME = "scores";
const SCORES_DB = "out/scores.sqlite";
const EMBEDDING_ORDER = [
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


type EmbeddingKey = (typeof EMBEDDING_ORDER)[number];

type PlayerScoreRow = {
  playerId: number;
  playerName: string;
  team: string | null;
  FG: number;
  FT: number;
  "3PTM": number;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TOV: number;
  totalZ: number;
};

type MetadataRow = {
  player_id: number;
  player_name: string;
  team: string | null;
  total_z: number;
  FG: number;
  FT: number;
  three_ptm: number;
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TOV: number;
};

function readPlayerByName(name: string): PlayerScoreRow | undefined {
  const db = new Database(SCORES_DB, { readonly: true });
  const row = db
    .query(
      `SELECT
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
      FROM player_scores
      WHERE player_name = ?
      LIMIT 1;`
    )
    .get(name) as PlayerScoreRow | undefined;

  db.close();
  return row;
}

function buildEmbedding(row: PlayerScoreRow): number[] {
  return EMBEDDING_ORDER.map((key: EmbeddingKey) => Number(row[key] ?? 0));
}

function formatPlayerLine(match: {
  rank: number;
  metadata: MetadataRow;
  distance: number | null;
}): string {
  const { rank, metadata, distance } = match;
  const distanceStr =
    distance !== null && distance !== undefined
      ? distance.toFixed(4)
      : "n/a";
  return `${rank}. ${metadata.player_name} (${metadata.team ?? "FA"}) — total z ${metadata.total_z.toFixed(2)} — distance ${distanceStr}`;
}

const playerNameArg = Bun.argv.slice(2).join(" ").trim();
if (!playerNameArg) {
  console.error("Usage: bun scripts/find-similar.ts \"Player Name\"");
  process.exit(1);
}

const targetPlayer = readPlayerByName(playerNameArg);
if (!targetPlayer) {
  console.error(`Player "${playerNameArg}" not found in ${SCORES_DB}`);
  process.exit(1);
}

const targetEmbedding = buildEmbedding(targetPlayer);

const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
const collection = await client.getCollection({
  name: COLLECTION_NAME,
  embeddingFunction: createManualEmbeddingInstance(),
});

const queryResult = await collection.query({
  queryEmbeddings: [targetEmbedding],
  nResults: 6,
  include: ["metadatas", "distances"],
});

const neighbors = (queryResult.ids[0] ?? [])
  .map((id, idx) => ({
    id,
    metadata: queryResult.metadatas?.[0]?.[idx] as MetadataRow | undefined,
    distance: queryResult.distances?.[0]?.[idx] ?? null,
  }))
  .filter((entry) =>
    entry.metadata && entry.id !== targetPlayer.playerId.toString(),
  )
  .slice(0, 3);

if (!neighbors.length) {
  console.log(`No similar players found for ${targetPlayer.playerName}.`);
  process.exit(0);
}

console.log(
  `Top 3 players similar to ${targetPlayer.playerName} (${targetPlayer.team ?? "FA"}):`,
);

neighbors.forEach((match, index) => {
  console.log(
    formatPlayerLine({
      rank: index + 1,
      metadata: match.metadata!,
      distance: match.distance,
    }),
  );
});
