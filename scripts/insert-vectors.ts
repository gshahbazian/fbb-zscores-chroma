import { ChromaClient } from "chromadb";
import { Database } from "bun:sqlite";
import { createManualEmbeddingInstance } from "@utilities/lib/manual-embedding";

const CHROMA_HOST = "localhost";
const CHROMA_PORT = 8000;
const COLLECTION_NAME = "scores";
const SCORES_DB_PATH = "out/scores.sqlite";
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

const embeddingFunction = createManualEmbeddingInstance();

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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function readScores(): PlayerScoreRow[] {
  const db = new Database(SCORES_DB_PATH, { readonly: true });
  const rows = db
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
      ORDER BY total_z DESC;`
    )
    .all() as PlayerScoreRow[];

  db.close();
  return rows;
}

function buildEmbedding(row: PlayerScoreRow): number[] {
  return EMBEDDING_ORDER.map((key: EmbeddingKey) => {
    const value = row[key];
    return Number.isFinite(value) ? Number(value) : 0;
  });
}

async function initCollection(client: ChromaClient) {
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
    console.log(`Deleted existing collection: ${COLLECTION_NAME}`);
  } catch (error) {
    if (error instanceof Error && error.message?.includes("not found")) {
      // benign: collection was not present
    } else {
      console.warn(`Could not delete collection: ${error}`);
    }
  }

  const collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction,
  });
  return collection;
}

const scores = readScores();
if (!scores.length) {
  throw new Error("No player scores found in out/scores.sqlite");
}

const client = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
const collection = await initCollection(client);

const batches = chunkArray(scores, 100);
let processed = 0;

for (const batch of batches) {
  await collection.add({
    ids: batch.map((row) => row.playerId.toString()),
    embeddings: batch.map((row) => buildEmbedding(row)),
    documents: batch.map(
      (row) =>
        `${row.playerName} (${row.team ?? "FA"}) — total z ${row.totalZ.toFixed(2)}`,
    ),
    metadatas: batch.map((row) => ({
      player_id: row.playerId,
      player_name: row.playerName,
      team: row.team,
      total_z: row.totalZ,
      FG: row.FG,
      FT: row.FT,
      three_ptm: row["3PTM"],
      PTS: row.PTS,
      REB: row.REB,
      AST: row.AST,
      STL: row.STL,
      BLK: row.BLK,
      TOV: row.TOV,
    })),
  });

  processed += batch.length;
  console.log(`Inserted ${processed}/${scores.length} players…`);
}

console.log(`Inserted ${scores.length} player embeddings into Chroma collection "${COLLECTION_NAME}"`);
