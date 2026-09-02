import { Bell, CircleUserRound, Crown, LogOut, ShieldCheck, WalletCards } from "lucide-react";
import { useLocation } from "wouter";
import { clearProMovieToken } from "@/lib/promovieSession";
import { ProMovieBrand } from "./ProMovieBrand";

export function MemberHeader({ member }: { member: { name: string | null; email: string | null; coinBalance: number; role: "admin" | "user" } }) {
  const [, setLocation] = useLocation();
  const logout = () => { clearProMovieToken(); setLocation("/login"); };
  return (
    <header className="sticky top-0 z-40 border-b border-white/[.07] bg-[#0A0A0A]/90 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <ProMovieBrand />
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={() => setLocation("/")} className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/8">Home</button>
          <button onClick={() => setLocation("/movies")} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/8 hover:text-white">Movies</button>
          <button onClick={() => setLocation("/dramas")} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/8 hover:text-white">Dramas</button>
          <button onClick={() => setLocation("/cricket")} className="rounded-full px-4 py-2 text-sm font-bold text-[#ff5963] transition hover:bg-[#E50914]/10 hover:text-white">Live Cricket</button>
          <button onClick={() => setLocation("/profile")} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/8 hover:text-white">My Library</button>
          {member.role === "admin" && <button onClick={() => setLocation("/admin")} className="inline-flex items-center gap-2 rounded-full bg-[#E50914] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff202b]"><ShieldCheck className="h-4 w-4" />Admin Panel</button>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setLocation("/cricket")} className="hidden rounded-full border border-[#E50914]/25 bg-[#E50914]/[.08] px-3 py-2 text-xs font-bold text-[#ff6670] sm:block md:hidden">Live</button>
          <button onClick={() => setLocation("/profile")} className="hidden items-center gap-2 rounded-full border border-[#FFC107]/25 bg-[#FFC107]/[.08] px-3 py-2 text-sm font-bold text-[#FFC107] sm:flex"><WalletCards className="h-4 w-4" />{member.coinBalance.toLocaleString()} coins</button>
          <button className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-white/8 hover:text-white" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
          <button onClick={() => setLocation("/profile")} className="grid h-9 w-9 place-items-center rounded-full bg-zinc-800 text-zinc-200" aria-label="Open profile"><CircleUserRound className="h-5 w-5" /></button>
          <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
  );
}
