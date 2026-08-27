import { LoaderCircle, Upload, Video } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { uploadVideoToSignedUrl } from "@/lib/directVideoUpload";
import { canDirectlyUploadLocalVideo, getPublicHttpsVideoUrl } from "@/lib/mediaUpload";

type Props = {
  token: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind: "image" | "video";
  required?: boolean;
};

const asBase64 = (file: File) => new Promise<{ fileName: string; contentType: string; base64: string }>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Could not read this file."));
  reader.onload = () => resolve({ fileName: file.name, contentType: file.type || "application/octet-stream", base64: String(reader.result).split(",")[1] ?? "" });
  reader.readAsDataURL(file);
});

export function PublicVideoPreview({ value }: { value: string }) {
  const [previewError, setPreviewError] = useState(false);
  const previewUrl = getPublicHttpsVideoUrl(value);
  useEffect(() => { setPreviewError(false); }, [previewUrl]);
  if (!previewUrl) return null;
  return <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/50 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-zinc-400">Video preview</p><video key={previewUrl} className="aspect-video w-full rounded-lg bg-black" controls playsInline preload="metadata" src={previewUrl} onCanPlay={() => setPreviewError(false)} onError={() => setPreviewError(true)}>Your browser cannot preview this video.</video>{previewError && <p className="mt-2 text-xs font-semibold text-amber-300">This URL could not be played in the preview. Check that it is a public HTTPS MP4/video link, then save it again.</p>}<p className="mt-2 break-all text-xs text-zinc-500">Ready to save: {previewUrl}</p></div>;
}

export function ProMovieMediaField({ token, label, value, onChange, kind, required = false }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const previewUrl = kind === "video" ? getPublicHttpsVideoUrl(value) : null;
  const uploadAsset = trpc.promovie.admin.uploadAsset.useMutation();
  const createVideoUpload = trpc.promovie.admin.createVideoUpload.useMutation();

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadAsset.mutateAsync({ token, ...(await asBase64(file)) });
      onChange(result.url);
      toast.success("Image uploaded to Supabase Storage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally { setUploading(false); }
  };

  const uploadVideo = async (file: File) => {
    if (!canDirectlyUploadLocalVideo(file.size)) {
      return toast.error("This Storage bucket currently accepts local video files up to 50 MB. For a larger episode, paste a public HTTPS video URL instead.");
    }
    setUploading(true); setProgress(null); setUploadStatus("Preparing secure upload…");
    try {
      const ticket = await createVideoUpload.mutateAsync({ token, fileName: file.name, contentType: file.type || "video/mp4", size: file.size });
      setUploadStatus("Uploading to Supabase…");
      await uploadVideoToSignedUrl({ file, uploadUrl: ticket.uploadUrl, contentType: file.type || "video/mp4", onProgress: percent => { setProgress(percent); setUploadStatus(`Uploading to Supabase: ${percent}%`); } });
      setProgress(100);
      setUploadStatus("Upload complete. Opening preview…");
      onChange(ticket.publicUrl);
      toast.success("Video uploaded. Preview is ready below.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Video upload failed.");
    } finally { setUploading(false); window.setTimeout(() => { setProgress(null); setUploadStatus(""); }, 600); }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    void (kind === "video" ? uploadVideo(file) : uploadImage(file));
  };

  return <div className="field-label"><span>{label}</span>
    <div className="flex gap-2"><input required={required} type={kind === "video" ? "url" : "text"} value={value} onChange={event => onChange(event.target.value)} onBlur={event => { const entered = event.target.value.trim(); if (kind === "video" && entered && !getPublicHttpsVideoUrl(entered)) toast.error("Use a public HTTPS video URL, for example https://example.com/video.mp4."); }} placeholder="Upload file or paste a public https:// URL" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#E50914]" />
      <label className="grid w-12 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-300 transition hover:border-red-500 hover:text-white">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : kind === "video" ? <Video className="h-4 w-4" /> : <Upload className="h-4 w-4" />}<input className="hidden" type="file" accept={kind === "video" ? "video/*" : "image/*"} disabled={uploading} onChange={event => handleFile(event.target.files?.[0])} /></label>
    </div>
    {kind === "video" && <p className="text-xs font-normal leading-5 text-zinc-500">Local videos up to 50 MB upload directly from this browser to Supabase. For a larger episode, paste an external MP4, Bunny.net, or Cloudflare R2 HTTPS URL and it will be saved as-is.</p>}
    {kind === "video" && value.trim() && !previewUrl && <p className="text-xs font-semibold text-amber-300">Paste a complete public HTTPS video URL to show a preview and save it.</p>}
    {kind === "video" && <PublicVideoPreview value={value} />}
    {progress !== null && <div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-[#E50914] transition-[width] duration-200" style={{ width: `${progress}%` }} /></div>}
    {uploadStatus && <p className="text-xs font-bold text-red-300">{uploadStatus}</p>}
  </div>;
}
