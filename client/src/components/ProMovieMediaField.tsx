import { createClient } from "@supabase/supabase-js";
import { LoaderCircle, Upload, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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

const configuredUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const browserStorage = createClient(
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(configuredUrl ?? "") ? configuredUrl : "https://iwhsbvrrakutsodsvjbt.supabase.co",
  /^sb_publishable_[A-Za-z0-9_-]+$/.test(configuredKey ?? "") ? configuredKey : "sb_publishable_eCMoulv4XTyKE6gvBhGRlQ_LBwip4NF",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export function ProMovieMediaField({ token, label, value, onChange, kind, required = false }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
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
    if (file.size > 2 * 1024 * 1024 * 1024) return toast.error("Videos must be 2 GB or smaller.");
    setUploading(true); setProgress(8);
    try {
      const ticket = await createVideoUpload.mutateAsync({ token, fileName: file.name, contentType: file.type || "video/mp4", size: file.size });
      setProgress(24);
      const { error } = await browserStorage.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type || "video/mp4" });
      if (error) throw error;
      setProgress(100);
      onChange(ticket.publicUrl);
      toast.success("Video uploaded directly to Supabase Storage.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Video upload failed.");
    } finally { setUploading(false); setProgress(null); }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    void (kind === "video" ? uploadVideo(file) : uploadImage(file));
  };

  return <label className="field-label">{label}
    <div className="flex gap-2"><input required={required} value={value} onChange={event => onChange(event.target.value)} placeholder="Upload file or paste a public https:// URL" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#E50914]" />
      <label className="grid w-12 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[.04] text-zinc-300 transition hover:border-red-500 hover:text-white">{uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : kind === "video" ? <Video className="h-4 w-4" /> : <Upload className="h-4 w-4" />}<input className="hidden" type="file" accept={kind === "video" ? "video/*" : "image/*"} disabled={uploading} onChange={event => handleFile(event.target.files?.[0])} /></label>
    </div>
    {kind === "video" && <p className="text-xs font-normal leading-5 text-zinc-500">Supported-size videos upload directly from this browser to Supabase. For larger files, paste an external MP4, Bunny.net, or Cloudflare R2 HTTPS URL and it will be saved as-is.</p>}
    {progress !== null && <div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-[#E50914] transition-[width] duration-200" style={{ width: `${progress}%` }} /></div>}
    {progress !== null && <p className="text-xs font-bold text-red-300">Uploading to Supabase: {progress}%</p>}
  </label>;
}
