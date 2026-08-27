import { describe, expect, it } from "vitest";
import { startPlaybackSession, verifyPlaybackHeartbeat } from "./playbackSessions";

describe("ProMovie playback sessions", () => {
  it("rejects a heartbeat before one minute has elapsed", () => {
    const { ticket } = startPlaybackSession({ userId: 7, movieId: 9, episodeId: 4 });
    expect(verifyPlaybackHeartbeat({ ticket, userId: 7, movieId: 9, episodeId: 4 })).toEqual({ eligible: false });
  });
  it("rejects playback tickets used by a different user", () => {
    const { ticket } = startPlaybackSession({ userId: 7, movieId: 9 });
    expect(() => verifyPlaybackHeartbeat({ ticket, userId: 8, movieId: 9 })).toThrow("Start a valid playback session");
  });
});
