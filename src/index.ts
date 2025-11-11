import { serve } from "bun";

import {
  DEFAULT_AUTOCOMPLETE_LIMIT,
  DEFAULT_SIMILAR_RESULTS,
  MAX_AUTOCOMPLETE_LIMIT,
  MAX_SIMILAR_RESULTS,
} from "@utilities/config";
import {
  getPlayerById,
  getPlayersByIds,
  searchPlayers,
} from "@utilities/db/scores";
import { getRawStatsByIds } from "@utilities/db/rawStats";
import { findSimilarPlayers } from "@utilities/services/similarity";
import type { PlayerScoreRow, RawStatsRow } from "@utilities/types/player";
import index from "./index.html";

const server = serve({
  routes: {
    "/api/players/search": {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const query = url.searchParams.get("q")?.trim() ?? "";
          const limit = clampLimitParam(
            url.searchParams.get("limit"),
            DEFAULT_AUTOCOMPLETE_LIMIT,
            MAX_AUTOCOMPLETE_LIMIT,
          );
          const results = searchPlayers(query, limit);

          return Response.json({
            query,
            limit,
            results: results.map((row) => ({
              id: row.playerId,
              name: row.playerName,
              team: row.team,
              totalZ: row.totalZ,
            })),
          });
        } catch (error) {
          console.error("player search failed", error);
          return internalError();
        }
      },
    },

    "/api/players/:playerId": async (req) => {
      const playerId = parsePlayerId(req.params.playerId);
      if (playerId === null) {
        return badRequest("playerId must be a number");
      }

      try {
        const player = getPlayerById(playerId);
        if (!player) {
          return notFound(`Player ${playerId} not found`);
        }

        const rawStats = getRawStatsByIds([playerId]);
        return Response.json({
          player: serializePlayer(player),
          rawStats: serializeRawStats(rawStats[playerId]),
        });
      } catch (error) {
        console.error("player lookup failed", error);
        return internalError();
      }
    },

    "/api/players/:playerId/similar": async (req) => {
      const playerId = parsePlayerId(req.params.playerId);
      if (playerId === null) {
        return badRequest("playerId must be a number");
      }

      const url = new URL(req.url);
      const limit = clampLimitParam(
        url.searchParams.get("limit"),
        DEFAULT_SIMILAR_RESULTS,
        MAX_SIMILAR_RESULTS,
      );

      try {
        const player = getPlayerById(playerId);
        if (!player) {
          return notFound(`Player ${playerId} not found`);
        }

        const neighbors = await findSimilarPlayers(player, limit);
        const similarIds = neighbors.map((neighbor) => neighbor.playerId);
        const scoreRows = getPlayersByIds(similarIds);
        const scoreMap = new Map(
          scoreRows.map((row) => [row.playerId, row] as const),
        );
        const rawStatsLookup = getRawStatsByIds([playerId, ...similarIds]);

        const response = {
          player: {
            ...serializePlayer(player),
            rawStats: serializeRawStats(rawStatsLookup[playerId]),
          },
          similar: neighbors.map((neighbor) => {
            const row = scoreMap.get(neighbor.playerId);
            return {
              distance: neighbor.distance,
              player: row ? serializePlayer(row) : null,
              rawStats: serializeRawStats(rawStatsLookup[neighbor.playerId]),
            };
          }),
          limit,
        };

        return Response.json(response);
      } catch (error) {
        console.error("similar players lookup failed", error);
        return Response.json(
          { error: "Similarity service unavailable" },
          { status: 503 },
        );
      }
    },

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

function parsePlayerId(value: string | undefined): number | null {
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clampLimitParam(
  value: string | null,
  fallback: number,
  max: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
}

function serializePlayer(row: PlayerScoreRow) {
  const { playerId, playerName, team, totalZ, ...zscores } = row;
  return {
    id: playerId,
    name: playerName,
    team,
    totalZ,
    zscores,
  };
}

function serializeRawStats(row: RawStatsRow | undefined) {
  return row ?? null;
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function notFound(message: string) {
  return Response.json({ error: message }, { status: 404 });
}

function internalError() {
  return Response.json({ error: "Unexpected server error" }, { status: 500 });
}
