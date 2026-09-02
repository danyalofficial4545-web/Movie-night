# ProMovie release notes

## Release status

The imported repository `danyalofficial4545-web/Movie-night` has been updated and pushed to `main` at commit `a438227` (`Harden playback downloads and Vercel assets`). The working tree is clean.

Temporary preview: [Open ProMovie preview](https://3100-itqx63x8vjtv9y80zwgyd-78e54d72.us1.manus.computer/signup)

GitHub: [danyalofficial4545-web/Movie-night](https://github.com/danyalofficial4545-web/Movie-night)

## Implemented changes

| Area | Result |
|---|---|
| Video links | Any complete public HTTPS URL is accepted without requiring `.mp4`. The original URL is saved as-is. Native `<video src="...">` playback is attempted first with `crossOrigin="anonymous"`; supported providers then fall back to the same-origin range proxy. The whitelist covers Pixeldrain, Buzzheavier, Catbox domains, tmpfiles, Gofile, Streamtape, Mixdrop, Bunny.net, and Cloudflare R2-style hosts. Non-video proxy responses are rejected. |
| Premium Bro Player | Added dark glass controls, rounded responsive player, title overlay, center play/pause interaction, three-second auto-hide controls, animated play feedback, progress-aware seek bar, time display, fullscreen, Chromecast request flow, direct/fallback source indicator, and mobile gesture zones. |
| Gestures | Left-side vertical swipes adjust brightness; right-side vertical swipes adjust volume and show percentage; horizontal swipes seek by 10 seconds and show a seek feedback overlay. Taps remain play/pause actions. |
| Quality and download | Settings exposes Auto, 1080p, 720p, 480p, and 360p. The UI is ready for variants and uses the same source when variants are unavailable. Download uses the currently active direct or proxied source. |
| Episode flow | Published episodes are ordered, a next episode is selected automatically, and a ten-second countdown with cancel/play-next controls appears at the end of playback. |
| Cricket Hub | Added `/cricket`, a Cricbuzz-inspired responsive live-score page, server-side CricketData integration, normalized score cards, explicit setup/error states, 30-second client polling, and a 25-second server cache. Configure `CRICKET_API_KEY` in Vercel for live data. |
| Referrals | New signups use the persisted referrer relationship. Both accounts receive exactly 50 coins in one database transaction, with a row lock and wallet-transaction check preventing duplicate credits. The referral token is cleared after signup. Profile now includes Total Referrals, Coins Earned, per-invite reward, copy link, and WhatsApp sharing. |
| Vercel | Added `api/index.ts`, `vercel.json`, and `.env.example`. Routes are code-split with lazy loading. Unconfigured analytics placeholders and Manus-only hero asset paths were removed so the Vercel build is self-contained. |

## Validation

The following checks passed:

- `pnpm check`
- Focused Vitest suite: 16 tests passed across Cricket, URL, preview, resolver, watch-source, and ProMovie regression tests.
- `npm run build`: completed with zero build errors. Route chunks are code-split; the largest application chunk is approximately 412 kB before gzip.
- Vercel API entrypoint compilation with esbuild.
- Local and public preview route checks: signup rendered correctly; unauthenticated `/cricket` correctly redirected to `/login`.
- Known-good public MP4 browser probe loaded native metadata successfully.

The complete `pnpm test` command still has three environment-dependent failures in the imported test suite: two suites require Supabase credentials and one nested-category test requires a live database. The current session has none of `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `DATABASE_URL`; this is why those tests cannot run here. The changed focused suite and production build are green.

## Important Pixeldrain note

The exact supplied URL `https://pixeldrain.com/api/file/TgSke7jP?download` was tested in the browser. Pixeldrain currently returns HTTP 403 with `file_rate_limited_captcha_required`, stating that hotlinking requires the uploader or downloader to have a paid subscription. This is a provider-side anti-hotlink policy, not an MP4-extension validation failure. ProMovie now accepts the URL, saves it unchanged, tries the direct source, and tries its same-origin fallback; it cannot bypass Pixeldrain’s CAPTCHA or subscription policy. Once the provider permits hotlinking, the same URL follows the playable preview path without code changes.

## Vercel environment variables

Set the variables from `.env.example` in the Vercel project. The required ProMovie server names are `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CRICKET_API_KEY`; add the imported Manus runtime variables only if the corresponding feature is used. Never expose the Supabase service-role key as a `VITE_*` browser variable.

