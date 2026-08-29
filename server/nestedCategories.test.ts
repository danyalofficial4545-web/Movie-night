import { describe, expect, it } from "vitest";
import { createCategory, createEpisode, createMovie, deleteCategory, getEpisode, getMovie, listPublishedCatalog, listSubCategories } from "./db";
import { resolveVideoPlaybackLink } from "./videoLinkResolver";

describe("ProMovie nested category folders", () => {
  it("stores Osman Ghazi, Season 1, and Episode 1 in the intended hierarchy without retaining test content", async () => {
    const suffix = Date.now();
    const main = await createCategory("Osman Ghazi", `osman-ghazi-${suffix}`, "https://iwhsbvrrakutsodsvjbt.supabase.co/storage/v1/object/public/promovie-assets/test/main.svg", "drama");
    let seasonId: number | undefined;
    try {
      const season = await createCategory("Season 1", `osman-ghazi-${suffix}-season-1`, "https://iwhsbvrrakutsodsvjbt.supabase.co/storage/v1/object/public/promovie-assets/test/season.svg", "drama", main.id);
      seasonId = season.id;
      const externalVideoUrl = "https://samplelib.com/preview/mp4/sample-5s.mp4";
      const movieId = await createMovie({ categoryId: season.id, title: "Osman Ghazi", description: "Temporary integration test record.", contentType: "series", posterUrl: null, thumbnailUrl: null, bannerUrl: null, videoUrl: externalVideoUrl, languageTags: ["Urdu"], quality: "1080p", releaseYear: 2026, downloadCost: 1000, isPublished: true });
      const episodeId = await createEpisode({ movieId, episodeNumber: 1, title: "Episode 1", thumbnailUrl: null, videoUrl: externalVideoUrl, languageTags: ["Urdu"], quality: "1080p", qualityVariants: null, isPublished: true });
      const suppliedUrl = "https://pixeldrain.com/api/file/TgSke7jP?download";
      const suppliedUrlEpisodeId = await createEpisode({ movieId, episodeNumber: 2, title: "Episode 2", thumbnailUrl: null, videoUrl: suppliedUrl, languageTags: ["Urdu"], quality: "1080p", qualityVariants: null, isPublished: false });

      const mainCatalog = await listPublishedCatalog("drama");
      const seasons = await listSubCategories(main.id);
      expect(mainCatalog.categories.some(category => category.id === main.id)).toBe(true);
      expect(mainCatalog.categories.some(category => category.id === season.id)).toBe(false);
      expect(seasons.map(category => category.id)).toContain(season.id);
      expect((await getMovie(movieId))?.videoUrl).toBe(externalVideoUrl);
      expect((await getEpisode(episodeId))?.videoUrl).toBe(externalVideoUrl);
      const savedSuppliedEpisode = await getEpisode(suppliedUrlEpisodeId);
      expect(savedSuppliedEpisode?.videoUrl).toBe(suppliedUrl);
      await expect(resolveVideoPlaybackLink(savedSuppliedEpisode!.videoUrl!)).resolves.toMatchObject({ originalUrl: suppliedUrl, playbackUrl: suppliedUrl, provider: "pixeldrain" });
    } finally {
      if (seasonId) await deleteCategory(seasonId);
      await deleteCategory(main.id);
    }
  }, 15_000);
});
