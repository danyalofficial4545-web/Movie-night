import { Film, FolderOpen, LoaderCircle, Tv } from "lucide-react";
import { useLocation } from "wouter";
import { MemberHeader } from "@/components/MemberHeader";
import { ProMovieGuard, useProMovieMember } from "@/components/ProMovieGuard";
import { trpc } from "@/lib/trpc";

export function CatalogBrowse({ type }: { type: "movie" | "drama" }) {
  const [, setLocation] = useLocation();
  const { token, data: member } = useProMovieMember();
  const catalog = trpc.promovie.catalog.useQuery({ token, categoryType: type }, { enabled: Boolean(token) });
  if (!member || catalog.isLoading) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A]"><LoaderCircle className="h-7 w-7 animate-spin text-[#E50914]" /></div>;
  const categories = catalog.data?.categories ?? [];
  const label = type === "movie" ? "Movies" : "Dramas";
  const Icon = type === "movie" ? Film : Tv;
  return <div className="min-h-screen bg-[#0A0A0A] text-white"><MemberHeader member={member} /><main className="container py-10"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#E50914]">ProMovie collection</p><h1 className="mt-2 font-display text-6xl tracking-[-.06em]">{label}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">Open a category cover to browse the real {type === "movie" ? "movie" : "drama series"} folders published by the administrator.</p></div><Icon className="hidden h-10 w-10 text-[#E50914] sm:block" /></div>{categories.length === 0 ? <section className="mt-9 rounded-[1.8rem] border border-white/[.08] bg-zinc-950 p-8 sm:p-12"><FolderOpen className="h-8 w-8 text-[#E50914]" /><h2 className="mt-5 font-display text-4xl tracking-[-.05em]">No {label.toLowerCase()} folders yet.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">This page stays empty until an administrator creates a {type} category and publishes real media folders.</p></section> : <section className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{categories.map(category => <button key={category.id} onClick={() => setLocation(`/category/${category.id}`)} className="group relative aspect-[16/9] overflow-hidden rounded-[1.5rem] border border-white/[.08] bg-zinc-900 text-left transition duration-200 hover:-translate-y-1 hover:border-red-500/45">{category.coverUrl ? <img src={category.coverUrl} alt={`${category.name} cover`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_72%_22%,rgba(229,9,20,.32),transparent_38%),linear-gradient(135deg,#262626,#090909)]" />}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-red-300">Category folder</p><h2 className="mt-1 font-display text-4xl tracking-[-.05em]">{category.name}</h2></div></button>)}</section>}</main></div>;
}

export default function MoviesPage() { return <ProMovieGuard><CatalogBrowse type="movie" /></ProMovieGuard>; }
