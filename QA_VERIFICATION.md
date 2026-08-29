# ProMovie live verification

## Published check — 27 August 2026

The public `/signup` page at `https://earnpackpro-3nzfwkdg.manus.space/signup` rendered successfully. It presents Full name, Gmail, Mobile number, and Password fields with the message that the account opens immediately after signup; no OTP or email-verification control is shown.

The public `/movies` route redirected an unauthenticated visitor to `/login` and did not expose catalog content. The published login screen rendered successfully without a browser initialization error.

The public `/dramas` route also redirected an unauthenticated visitor to `/login` without exposing catalog content. After the owner-requested republish, `/signup` was checked again and rendered successfully on the same public domain.

The authenticated administrator sequence remains intentionally unverified because the administrator password and a real episode file or external video URL have not been supplied in this session.

## Video-preview test — 27 August 2026

The originally supplied `test-videos.co.uk` Big Buck Bunny URL returned HTTP 404, so it cannot display usable video content. The URL input still accepts a complete HTTPS address and renders its preview container, but unavailable sources show an explicit playback warning.

The working public source `https://samplelib.com/preview/mp4/sample-5s.mp4` returned `200 OK` with `video/mp4` and rendered in the browser’s native video player. The cleanup-safe nested Category → Season → Movie → Episode test saves this exact URL in both the temporary movie and temporary episode records, retrieves both URLs unchanged, and removes the temporary records.

After publishing the video-preview repair, the public `/signup` route loaded successfully again on `https://earnpackpro-3nzfwkdg.manus.space/signup`. The production site is available for the final owner-authenticated administrator verification.

## Supplied provider-link inspection — 28 August 2026

The supplied `https://buzzheavier.com/8q5samzjluet/download` request resolves to a Buzzheavier file landing page for `VID-20260820-WA0011.mp4` (31.5 MB), not a raw video response in the browser. The page exposes separate “Download File”, “Copy download link”, and “Open in browser instead” controls. ProMovie must therefore accept the public HTTPS source without incorrectly rejecting the provider URL, but native in-page playback still depends on the host exposing a direct video response with a browser-compatible codec and permissive embedding/CORS behavior.

The provider’s `Open in browser instead` endpoint returns a native video element with a separate, tokenized `https://ts.buzzheavier.com/d/…` MP4 source. That source is not stable enough to store permanently because the provider issues it dynamically. Bro Player should keep the original public Buzzheavier URL in the catalog and resolve the provider’s current direct MP4 source when playback or preview is requested.

The supplied Buzzheavier file was rechecked on 28 August 2026 and remains publicly available as a 31.5 MB MP4 file landing page. The provider UI’s dynamic preview control did not activate through generic browser automation, reinforcing the need for the application’s server-side resolver rather than saving a short-lived direct media token.
The supplied Pixeldrain URL `https://pixeldrain.com/api/file/TgSke7jP?download` returned `Content-Type: video/mp4`, `Accept-Ranges: bytes`, and `Access-Control-Allow-Origin: *` during verification. ProMovie now accepts it without requiring an `.mp4` suffix and renders it in a native HTML5 video preview with `crossOrigin="anonymous"`; the source is preserved unchanged for Movie/Episode persistence and Bro Player playback.
Live verification on 29 August 2026: the published Admin Episode form accepts `https://pixeldrain.com/api/file/TgSke7jP?download` without an `.mp4` suffix and renders the preview container. Direct browser fetches from the current session returned HTTP 403 JSON, while the earlier sandbox HEAD response returned `Content-Type: video/mp4`, `Accept-Ranges: bytes`, and `Access-Control-Allow-Origin: *`. The deployed ProMovie proxy returned an HTML challenge response for this provider in the live session, so playback depends on the provider allowing the request origin/server; ProMovie now preserves the URL and reports a playback error rather than falsely rejecting the URL as invalid.
