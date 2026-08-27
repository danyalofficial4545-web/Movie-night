import { describe, expect, it } from "vitest";
import { createCategory, createEpisode, createMovie, deleteCategory, listPublishedCatalog, listSubCategories } from "./db";

describe("ProMovie nested category folders", () => {
  it("stores Osman Ghazi, Season 1, and Episode 1 in the intended hierarchy without retaining test content", async () => {
    const suffix = Date.now();
    const main = await createCategory("Osman Ghazi", `osman-ghazi-${suffix}`, "https://iwhsbvrrakutsodsvjbt.supabase.co/storage/v1/object/public/promovie-assets/test/main.svg", "drama");
    let seasonId: number | undefined;
    try {
      const season = await createCategory("Season 1", `osman-ghazi-${suffix}-season-1`, "https://iwhsbvrrakutsodsvjbt.supabase.co/storage/v1/object/public/promovie-assets/test/season.svg", "drama", main.id);
      seasonId = season.id;
      const movieId = await createMovie({ categoryId: season.id, title: "Osman Ghazi", description: "Temporary integration test record.", contentType: "series", posterUrl: null, thumbnailUrl: null, bannerUrl: null, videoUrl: null, languageTags: ["Urdu"], quality: "1080p", releaseYear: 2026, downloadCost: 1000, isPublished: true });
      await createEpisode({ movieId, episodeNumber: 1, title: "Episode 1", thumbnailUrl: null, videoUrl: "https://example.com/episode-1.mp4", languageTags: ["Urdu"], quality: "1080p", qualityVariants: null, isPublished: true });

      const mainCatalog = await listPublishedCatalog("drama");
      const seasons = await listSubCategories(main.id);
      expect(mainCatalog.categories.some(category => category.id === main.id)).toBe(true);
      expect(mainCatalog.categories.some(category => category.id === season.id)).toBe(false);
      expect(seasons.map(category => category.id)).toContain(season.id);
    } finally {
      if (seasonId) await deleteCategory(seasonId);
      await deleteCategory(main.id);
    }
  }, 15_000);
});
