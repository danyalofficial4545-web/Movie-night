export type CricketInnings = {
  team: string;
  runs: number | null;
  wickets: number | null;
  overs: string | null;
};

export type CricketMatch = {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  dateTimeGMT: string | null;
  teams: string[];
  innings: CricketInnings[];
  seriesId: string | null;
};

export type CricketHubResponse = {
  available: boolean;
  fetchedAt: string;
  matches: CricketMatch[];
  message?: string;
};

type UnknownRecord = Record<string, unknown>;

let cache: { expiresAt: number; value: CricketHubResponse } | null = null;

export function resetLiveCricketCache() {
  cache = null;
}

const asRecord = (value: unknown): UnknownRecord => value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const asString = (value: unknown, fallback = "") => typeof value === "string" ? value : value == null ? fallback : String(value);
const asNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

function normalizeInnings(score: unknown): CricketInnings[] {
  const entries = Array.isArray(score) ? score : score && typeof score === "object" ? Object.values(asRecord(score)) : [];
  return entries.map(entry => {
    const item = asRecord(entry);
    return {
      team: asString(item.team || item.inning, "Score"),
      runs: asNumber(item.r || item.runs),
      wickets: asNumber(item.w || item.wickets),
      overs: item.o == null && item.overs == null ? null : asString(item.o || item.overs),
    };
  }).filter(item => item.runs !== null || item.wickets !== null || item.overs !== null);
}

function normalizeMatch(value: unknown, index: number): CricketMatch {
  const item = asRecord(value);
  return {
    id: asString(item.id, `match-${index}`),
    name: asString(item.name, "Cricket match"),
    matchType: asString(item.matchType, "match").toUpperCase(),
    status: asString(item.status, "Live"),
    venue: asString(item.venue, "Venue unavailable"),
    dateTimeGMT: item.dateTimeGMT ? asString(item.dateTimeGMT) : null,
    teams: Array.isArray(item.teams) ? item.teams.map(team => asString(team)).filter(Boolean) : [],
    innings: normalizeInnings(item.score),
    seriesId: item.series_id ? asString(item.series_id) : null,
  };
}

export async function getLiveCricketMatches(request: typeof fetch = fetch): Promise<CricketHubResponse> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const apiKey = process.env.CRICKET_API_KEY || process.env.CRICKETDATA_API_KEY || process.env.CRICAPI_KEY;
  if (!apiKey) {
    const value: CricketHubResponse = { available: false, fetchedAt: new Date().toISOString(), matches: [], message: "Add CRICKET_API_KEY to the server environment to enable live scores." };
    cache = { expiresAt: Date.now() + 30_000, value };
    return value;
  }

  try {
    const endpoint = new URL("https://api.cricapi.com/v1/currentMatches");
    endpoint.searchParams.set("apikey", apiKey);
    endpoint.searchParams.set("offset", "0");
    const response = await request(endpoint, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Cricket provider returned HTTP ${response.status}`);
    const payload = asRecord(await response.json());
    if (asString(payload.status).toLowerCase() !== "success") throw new Error(asString(asRecord(payload.info).message, "Cricket provider returned an unsuccessful response."));
    const matches = Array.isArray(payload.data) ? payload.data.map(normalizeMatch) : [];
    const value: CricketHubResponse = { available: true, fetchedAt: new Date().toISOString(), matches };
    cache = { expiresAt: Date.now() + 25_000, value };
    return value;
  } catch (error) {
    const value: CricketHubResponse = { available: false, fetchedAt: new Date().toISOString(), matches: [], message: error instanceof Error ? error.message : "Live cricket scores are temporarily unavailable." };
    cache = { expiresAt: Date.now() + 15_000, value };
    return value;
  }
}
