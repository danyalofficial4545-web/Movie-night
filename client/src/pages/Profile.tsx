import { CalendarDays, Check, CircleUserRound, Copy, Download, Film, Gift, History, Landmark, LoaderCircle, Mail, MessageCircle, Phone, Share2, WalletCards } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { MemberHeader } from "@/components/MemberHeader";
import { ProMovieGuard, useProMovieMember } from "@/components/ProMovieGuard";
import { trpc } from "@/lib/trpc";

function ProfileView() {
  const [, setLocation] = useLocation();
  const { token, data: member } = useProMovieMember();
  const [copied, setCopied] = useState(false);
  const profile = trpc.promovie.profile.useQuery({ token }, { enabled: Boolean(token) });
  if (!member || profile.isLoading) return <div className="grid min-h-screen place-items-center bg-[#0A0A0A]"><LoaderCircle className="h-7 w-7 animate-spin text-[#E50914]" /></div>;
  const data = profile.data;
  if (!data) return null;
  const details = data.profile;
  const referralLink = `${window.location.origin}/ref/${details.id}`;
  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };
  const shareOnWhatsApp = () => {
    const text = `Join me on ProMovie and start watching. Sign up here: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return <div className="min-h-screen bg-[#0A0A0A] text-white">
    <MemberHeader member={member} />
    <main className="container py-10 sm:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-[1.7rem] border border-white/[.09] bg-zinc-950 p-6 sm:p-8"><div className="flex gap-5"><div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-zinc-800 text-zinc-300"><CircleUserRound className="h-10 w-10" /></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#E50914]">Member profile</p><h1 className="mt-2 font-display text-5xl tracking-[-.06em]">{details.name || "ProMovie member"}</h1><p className="mt-2 text-sm text-zinc-500">Joined {new Date(details.createdAt).toLocaleDateString()}</p></div></div><div className="mt-8 grid gap-3 border-t border-white/[.07] pt-6 text-sm text-zinc-400"><p className="flex items-center gap-3"><Mail className="h-4 w-4" />{details.email}</p><p className="flex items-center gap-3"><Phone className="h-4 w-4" />{details.mobile}</p><p className="flex items-center gap-3"><CalendarDays className="h-4 w-4" />Member since {new Date(details.createdAt).toLocaleDateString()}</p></div></section>
        <section className="relative overflow-hidden rounded-[1.7rem] border border-[#FFC107]/20 bg-gradient-to-br from-[#2c2102] via-[#171102] to-zinc-950 p-6 sm:p-8"><WalletCards className="h-7 w-7 text-[#FFC107]" /><p className="mt-8 text-sm font-bold uppercase tracking-[.18em] text-[#ffda6b]">Wallet balance</p><p className="mt-2 font-display text-7xl tracking-[-.07em] text-[#FFC107]">{details.coinBalance.toLocaleString()}</p><p className="mt-1 text-sm text-[#f4d77a]/70">1000 coins = PKR 5 · 50 coins per active minute.</p><button onClick={() => setLocation("/withdraw")} className="primary-action mt-7 inline-flex items-center gap-2"><Landmark className="h-4 w-4" />Request withdrawal</button></section>
      </div>

      <section className="mt-7 overflow-hidden rounded-[1.7rem] border border-white/[.08] bg-zinc-950 p-6 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#E50914]">Referral dashboard</p><h2 className="mt-2 font-display text-4xl tracking-[-.05em]">Bring your people in</h2><p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">When a new member signs up through your link, both accounts receive <strong className="text-[#FFC107]">50 coins automatically</strong>.</p></div><Gift className="h-8 w-8 text-[#FFC107]" /></div><div className="mt-7 grid gap-3 sm:grid-cols-3"><MetricCard label="Total referrals" value={String(data.referralCount)} /><MetricCard label="Coins earned" value={details.referralCoinsEarned.toLocaleString()} accent /><MetricCard label="Per successful invite" value="50 coins" accent /></div><div className="mt-6 rounded-2xl border border-white/[.08] bg-black/30 p-4"><p className="text-xs font-bold uppercase tracking-[.15em] text-zinc-500">Your invite link</p><div className="mt-3 flex flex-col gap-3 sm:flex-row"><div className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">{referralLink}</div><button onClick={() => void copyReferralLink()} className="secondary-action inline-flex items-center justify-center gap-2 whitespace-nowrap">{copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</button><button onClick={shareOnWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-[#062b14] transition hover:bg-[#46e27e]"><MessageCircle className="h-4 w-4" />WhatsApp</button></div></div></section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2"><HistoryList title="Earnings history" icon={<History className="h-5 w-5" />} rows={data.transactions.map(item => ({ title: item.note || item.activity, detail: `${item.coinsDelta > 0 ? "+" : ""}${item.coinsDelta} coins · ${new Date(item.createdAt).toLocaleString()}` }))} empty="No coin activity yet." /><HistoryList title="Watch history" icon={<Film className="h-5 w-5" />} rows={data.watches.map(item => ({ title: item.episodeLabel || "Watched video", detail: `${Math.floor(item.watchedSeconds / 60)} min · Earned ${item.coinsEarned} coins · ${new Date(item.lastPlayedAt).toLocaleString()}` }))} empty="No watched episodes yet." /><HistoryList title="My downloads" icon={<Download className="h-5 w-5" />} rows={data.downloads.map(item => ({ title: `Movie #${item.movieId}`, detail: new Date(item.createdAt).toLocaleString() }))} empty="No downloads yet." /><HistoryList title="Withdrawal requests" icon={<Landmark className="h-5 w-5" />} rows={data.withdrawals.map(item => ({ title: `${item.method} · PKR ${item.pkrAmount}`, detail: `${item.coins} coins · ${item.status} · ${new Date(item.createdAt).toLocaleString()}` }))} empty="No withdrawal requests yet." /></section>
    </main>
  </div>;
}

function MetricCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-white/[.08] bg-black/25 p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-zinc-500">{label}</p><p className={`mt-2 font-display text-4xl tracking-[-.05em] ${accent ? "text-[#FFC107]" : "text-white"}`}>{value}</p></div>;
}

function HistoryList({ title, icon, rows, empty }: { title: string; icon: React.ReactNode; rows: { title: string; detail: string }[]; empty: string }) {
  return <section className="rounded-[1.5rem] border border-white/[.08] bg-zinc-950 p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-zinc-300">{icon}</span><h2 className="font-display text-3xl tracking-[-.05em]">{title}</h2></div>{rows.length === 0 ? <p className="mt-6 border-t border-dashed border-white/10 pt-6 text-sm text-zinc-500">{empty}</p> : <div className="mt-6 divide-y divide-white/[.06] border-t border-white/[.08]">{rows.map((row, index) => <div className="py-3" key={`${row.title}-${index}`}><p className="text-sm font-bold text-zinc-200">{row.title}</p><p className="mt-1 text-xs text-zinc-500">{row.detail}</p></div>)}</div>}</section>;
}

export default function Profile() { return <ProMovieGuard><ProfileView /></ProMovieGuard>; }
