import { ChromaClient, type Collection } from "chromadb";

import {
  CHROMA_COLLECTION_NAME,
  CHROMA_HOST,
  CHROMA_PORT,
  DEFAULT_SIMILAR_RESULTS,
  EMBEDDING_ORDER,
  MAX_SIMILAR_RESULTS,
} from "@utilities/config";
import { createManualEmbeddingInstance } from "@utilities/lib/manual-embedding";
import type { EmbeddingKey } from "@utilities/config";
import type { PlayerScoreRow } from "@utilities/types/player";

export type SimilarNeighbor = {
  playerId: number;
  distance: number | null;
};

const embeddingFunction = createManualEmbeddingInstance();
const chromaClient = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });

let collectionPromise: Promise<Collection> | null = null;

async function getCollection(): Promise<Collection> {
  if (!collectionPromise) {
    collectionPromise = chromaClient.getCollection({
      name: CHROMA_COLLECTION_NAME,
      embeddingFunction,
    });
  }
  return collectionPromise;
}

function buildEmbedding(row: PlayerScoreRow): number[] {
  return EMBEDDING_ORDER.map(
    (key: EmbeddingKey) => Number(row[key] ?? 0),
  );
}

function clampLimit(limit?: number | null): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_SIMILAR_RESULTS;
  }
  return Math.max(1, Math.min(MAX_SIMILAR_RESULTS, Math.floor(limit)));
}

export async function findSimilarPlayers(
  player: PlayerScoreRow,
  limit?: number,
): Promise<SimilarNeighbor[]> {
  const effectiveLimit = clampLimit(limit);
  const collection = await getCollection();
  const queryResult = await collection.query({
    queryEmbeddings: [buildEmbedding(player)],
    nResults: effectiveLimit + 1, // include the player themselves
    include: ["distances"],
  });

  const ids = queryResult.ids?.[0] ?? [];
  const distances = queryResult.distances?.[0] ?? [];

  const neighbors: SimilarNeighbor[] = [];

  ids.forEach((id, idx) => {
    if (!id) return;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return;
    if (numericId === player.playerId) return;
    neighbors.push({
      playerId: numericId,
      distance: distances[idx] ?? null,
    });
  });

  return neighbors.slice(0, effectiveLimit);
}
