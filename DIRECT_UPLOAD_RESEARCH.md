# ProMovie direct video upload design

For video files above 6 MB, ProMovie will use Supabase Storage's resumable TUS upload endpoint from the browser rather than place video bytes in a tRPC request. The browser receives a short-lived upload token from an administrator-authorized server procedure; the service-role key remains server-only.

The direct endpoint uses the project storage hostname `https://iwhsbvrrakutsodsvjbt.storage.supabase.co/storage/v1/upload/resumable`, uploads in 6 MB chunks, reports progress, and saves the resulting public URL under `promovie-assets/videos/`.

Supabase documents that standard uploads can be up to 5 GB but recommends resumable TUS uploads for files greater than 6 MB because reliability and progress reporting are better. Bucket-level limits may be lower, so the app requests a 2 GB configured video allowance but displays any storage-plan limit returned by Supabase rather than falsely accepting an unavailable size.

Sources: https://supabase.com/docs/guides/storage/uploads/standard-uploads and https://supabase.com/docs/guides/storage/uploads/resumable-uploads
