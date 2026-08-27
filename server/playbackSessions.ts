import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

type PlaybackSession = { userId: number; movieId: number; episodeId?: number; startedAt: number; lastHeartbeatAt: number; expiresAt: number };
const sessions = new Map<string, PlaybackSession>();

export function startPlaybackSession(input: { userId: number; movieId: number; episodeId?: number }) {
  const now = Date.now(); const ticket = randomUUID();
  sessions.set(ticket, { ...input, startedAt: now, lastHeartbeatAt: now, expiresAt: now + 30 * 60_000 });
  return { ticket, expiresAt: now + 30 * 60_000 };
}

export function verifyPlaybackHeartbeat(input: { ticket: string; userId: number; movieId: number; episodeId?: number }) {
  const session = sessions.get(input.ticket); const now = Date.now();
  if (!session || session.expiresAt < now || session.userId !== input.userId || session.movieId !== input.movieId || session.episodeId !== input.episodeId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Start a valid playback session before earning coins." });
  }
  if (now - session.lastHeartbeatAt < 55_000) return { eligible: false };
  session.lastHeartbeatAt = now; session.expiresAt = now + 30 * 60_000;
  return { eligible: true };
}
