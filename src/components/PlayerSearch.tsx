import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { PlayerSearchResponse, PlayerSummary } from "../types";

type SearchStatus = "idle" | "loading" | "success" | "error";

type PlayerSearchProps = {
  onSelect: (player: PlayerSummary) => void;
  disabled?: boolean;
};

const AUTOCOMPLETE_LIMIT = 8;

export function PlayerSearch({ onSelect, disabled = false }: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlayerSummary[]>([]);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setStatus("idle");
      setError(null);
      setDropdownOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setStatus("loading");
      setError(null);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          limit: String(AUTOCOMPLETE_LIMIT),
        });
        const response = await fetch(
          `/api/players/search?${params.toString()}`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );

        const payload = (await response.json()) as PlayerSearchResponse;
        if (!response.ok) {
          throw new Error(payload?.["error"] ?? "Failed to search players");
        }

        const results = payload?.results ?? [];
        if (!active) return;
        setSuggestions(results);
        setStatus("success");
        setDropdownOpen(true);
        setHighlightedIndex((index) =>
          results.length === 0 ? -1 : index === -1 ? 0 : Math.min(index, results.length - 1),
        );
      } catch (err) {
        if (!active || (err as Error).name === "AbortError") return;
        setSuggestions([]);
        setStatus("error");
        setError((err as Error).message || "Failed to search players");
      }
    }, 250);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [query]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!suggestions.length) return;
    const choice =
      highlightedIndex >= 0 && highlightedIndex < suggestions.length
        ? suggestions[highlightedIndex]
        : suggestions[0];
    selectPlayer(choice);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDropdownOpen(true);
      setHighlightedIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setDropdownOpen(true);
      setHighlightedIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        event.preventDefault();
        selectPlayer(suggestions[highlightedIndex]);
      }
    } else if (event.key === "Escape") {
      setDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const selectPlayer = (player: PlayerSummary) => {
    onSelect(player);
    setQuery(player.name);
    setSuggestions([]);
    setDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const showDropdown = isDropdownOpen && suggestions.length > 0;

  return (
    <div className="search-panel">
      <form className="search-form" onSubmit={handleSubmit} autoComplete="off">
        <label className="search-label" htmlFor="player-search">
          Search any NBA player
        </label>
        <div className="search-input-wrapper" data-loading={status === "loading"}>
          <input
            id="player-search"
            type="text"
            value={query}
            placeholder="Start typing a name..."
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            onFocus={() => suggestions.length > 0 && setDropdownOpen(true)}
          />
          {query && (
            <button
              type="button"
              className="clear-button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setDropdownOpen(false);
                setHighlightedIndex(-1);
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button type="submit" className="search-submit" disabled={disabled}>
            Enter
          </button>
        </div>
      </form>
      {status === "error" && <p className="error-text">{error}</p>}
      {showDropdown && (
        <ul className="suggestions" role="listbox" aria-label="Player suggestions">
          {suggestions.map((player, index) => (
            <li key={player.id}>
              <button
                type="button"
                className={index === highlightedIndex ? "suggestion active" : "suggestion"}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlayer(player)}
              >
                <span className="suggestion-name">{player.name}</span>
                <span className="suggestion-team">{player.team ?? "FA"}</span>
                <span className="suggestion-z">
                  Total Z: <strong>{player.totalZ.toFixed(2)}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="hint-text">Type at least two characters to search.</p>
      )}
    </div>
  );
}
