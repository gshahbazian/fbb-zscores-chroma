import {
  type EmbeddingFunction,
  registerEmbeddingFunction,
} from "chromadb";

export const MANUAL_EMBEDDING_NAME = "manual-scores";

class ManualScoresEmbedding implements EmbeddingFunction {
  name = MANUAL_EMBEDDING_NAME;

  static buildFromConfig(_config: Record<string, unknown>) {
    return new ManualScoresEmbedding();
  }

  getConfig(): Record<string, unknown> {
    return {};
  }

  async generate(): Promise<number[][]> {
    throw new Error(
      "ManualScoresEmbedding does not generate vectors. Provide embeddings explicitly.",
    );
  }
}

let registered = false;

function ensureManualEmbeddingRegistered() {
  if (registered) return;
  try {
    registerEmbeddingFunction(
      MANUAL_EMBEDDING_NAME,
      ManualScoresEmbedding as any,
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("already registered")
    ) {
      throw error;
    }
  }
  registered = true;
}

export function createManualEmbeddingInstance() {
  ensureManualEmbeddingRegistered();
  return new ManualScoresEmbedding();
}

export type { ManualScoresEmbedding };
