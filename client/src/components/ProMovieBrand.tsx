import { Clapperboard } from "lucide-react";
import { Link } from "wouter";

export function ProMovieBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 group" aria-label="ProMovie home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E50914] text-white shadow-[0_0_30px_rgba(229,9,20,.28)] transition-transform duration-200 group-hover:scale-105">
        <Clapperboard className="h-5 w-5" />
      </span>
      {!compact && <span className="font-display text-[1.65rem] leading-none tracking-[-.06em] text-white">Pro<span className="text-[#E50914]">Movie</span></span>}
    </Link>
  );
}
