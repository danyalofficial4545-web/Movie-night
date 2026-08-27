import { LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ProMovieBrand } from "@/components/ProMovieBrand";
import { trpc } from "@/lib/trpc";
import { saveProMovieToken } from "@/lib/promovieSession";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", password: "" });
  const signUp = trpc.promovie.auth.signUp.useMutation({
    onSuccess: ({ token }) => { saveProMovieToken(token); toast.success("Your account is ready. Welcome to ProMovie."); setLocation("/"); },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); const referrerId = Number(window.sessionStorage.getItem("promovie_referrer_id")) || undefined; signUp.mutate({ ...form, referrerId }); };
  const change = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));
  return <main className="auth-stage grid min-h-screen place-items-center px-5 py-7 text-white"><div className="w-full max-w-lg rounded-[2rem] border border-white/[.09] bg-zinc-950/80 p-7 shadow-2xl backdrop-blur-xl sm:p-10"><ProMovieBrand /><p className="mt-10 text-sm font-bold uppercase tracking-[.2em] text-[#E50914]">Start watching</p><h1 className="mt-3 font-display text-5xl tracking-[-.055em]">Create your account</h1><p className="mt-3 text-sm leading-6 text-zinc-400">One mobile number creates one ProMovie membership. Your account opens immediately after signup.</p>
  <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={submit}><label className="field-label sm:col-span-2">Full name<div className="input-shell"><UserRound className="h-4 w-4" /><input required value={form.fullName} onChange={e => change("fullName")(e.target.value)} placeholder="Your full name" /></div></label><label className="field-label">Gmail<div className="input-shell"><Mail className="h-4 w-4" /><input required type="email" value={form.email} onChange={e => change("email")(e.target.value)} placeholder="you@gmail.com" /></div></label><label className="field-label">Mobile number<div className="input-shell"><Phone className="h-4 w-4" /><input required value={form.mobile} onChange={e => change("mobile")(e.target.value)} placeholder="03xxxxxxxxx" /></div></label><label className="field-label sm:col-span-2">Password<div className="input-shell"><LockKeyhole className="h-4 w-4" /><input required minLength={8} type="password" value={form.password} onChange={e => change("password")(e.target.value)} placeholder="At least 8 characters" /></div></label><button disabled={signUp.isPending} className="primary-action mt-2 w-full sm:col-span-2">{signUp.isPending ? "Creating account…" : "Create and enter ProMovie"}</button></form>
  <p className="mt-6 text-center text-sm text-zinc-400">Already a member? <button onClick={() => setLocation("/login")} className="font-bold text-white underline decoration-red-500 underline-offset-4">Sign in</button></p></div></main>;
}
