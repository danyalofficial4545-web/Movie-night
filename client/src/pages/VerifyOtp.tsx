import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ProMovieBrand } from "@/components/ProMovieBrand";
import { trpc } from "@/lib/trpc";
import { saveProMovieToken } from "@/lib/promovieSession";

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const email = window.sessionStorage.getItem("promovie_pending_email") ?? "";
  const [code, setCode] = useState("");
  const verify = trpc.promovie.auth.verifyOtp.useMutation({ onSuccess: result => { saveProMovieToken(result.token); window.sessionStorage.removeItem("promovie_pending_email"); toast.success("Email verified. Welcome to ProMovie."); setLocation("/"); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!email) return setLocation("/signup"); verify.mutate({ email, code }); };
  return <main className="auth-stage grid min-h-screen place-items-center px-5 py-7 text-white"><div className="w-full max-w-md rounded-[2rem] border border-white/[.09] bg-zinc-950/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10"><div className="text-left"><ProMovieBrand /></div><div className="mx-auto mt-12 grid h-16 w-16 place-items-center rounded-2xl bg-[#E50914]/15 text-[#ff5360]"><ShieldCheck className="h-8 w-8" /></div><p className="mt-8 text-sm font-bold uppercase tracking-[.2em] text-[#E50914]">Email verification</p><h1 className="mt-3 font-display text-5xl tracking-[-.055em]">Enter your OTP</h1><p className="mt-3 text-sm leading-6 text-zinc-400">A six-digit verification code was sent to <strong className="text-zinc-200">{email || "your Gmail inbox"}</strong>.</p><form onSubmit={submit} className="mt-8"><input autoFocus required inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="h-16 w-full rounded-2xl border border-white/10 bg-black/50 text-center font-display text-4xl tracking-[.32em] text-white outline-none transition focus:border-[#E50914]" /><button disabled={verify.isPending} className="primary-action mt-5 w-full">{verify.isPending ? "Verifying…" : "Verify and enter ProMovie"}</button></form><button onClick={() => setLocation("/signup")} className="mt-6 text-sm text-zinc-400 transition hover:text-white">Use a different email</button></div></main>;
}
