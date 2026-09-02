import { Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ProMovieBrand } from "@/components/ProMovieBrand";
import { trpc } from "@/lib/trpc";
import { saveProMovieToken } from "@/lib/promovieSession";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signIn = trpc.promovie.auth.signIn.useMutation({
    onSuccess: result => { saveProMovieToken(result.token); toast.success("Welcome back to ProMovie."); setLocation("/"); },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); signIn.mutate({ email, password }); };
  return <main className="auth-stage min-h-screen px-5 py-7 text-white"><div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-6xl items-center justify-center"><div className="grid w-full overflow-hidden rounded-[2rem] border border-white/[.09] bg-zinc-950/70 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden min-h-[640px] overflow-hidden border-r border-white/[.07] p-10 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(229,9,20,.42),transparent_28%),radial-gradient(circle_at_35%_70%,rgba(105,20,28,.26),transparent_36%),linear-gradient(145deg,#23090c,#080808_68%)] opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/55 to-black" />
      <div className="relative"><ProMovieBrand /><div className="mt-28 max-w-md"><span className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-red-300"><Sparkles className="h-3.5 w-3.5" />Members only</span><h1 className="font-display text-6xl leading-[.9] tracking-[-.06em]">Every story.<br /><em className="font-body text-[#E50914]">Your screen.</em></h1><p className="mt-6 max-w-sm text-base leading-7 text-zinc-300">Sign in to see your private collection, track your watch time, and earn rewards from active playback.</p></div></div>
      <p className="relative text-xs text-zinc-500">ProMovie is empty at launch. New titles appear only when your administrator publishes them.</p>
    </section>
    <section className="flex min-h-[640px] items-center justify-center p-6 sm:p-12"><div className="w-full max-w-sm"><div className="mb-10 lg:hidden"><ProMovieBrand /></div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#E50914]">Welcome back</p><h2 className="mt-3 font-display text-5xl tracking-[-.055em]">Sign in</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Use the Gmail and password linked to your ProMovie account.</p>
      <form className="mt-9 space-y-4" onSubmit={submit}><label className="field-label">Gmail address<div className="input-shell"><Mail className="h-4 w-4" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" /></div></label><label className="field-label">Password<div className="input-shell"><LockKeyhole className="h-4 w-4" /><input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label="Show or hide password">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label><button disabled={signIn.isPending} className="primary-action mt-2 w-full">{signIn.isPending ? "Signing in…" : "Sign in to ProMovie"}</button></form>
      <p className="mt-7 text-center text-sm text-zinc-400">New here? <button onClick={() => setLocation("/signup")} className="font-bold text-white underline decoration-red-500 underline-offset-4">Create an account</button></p>
    </div></section>
  </div></div></main>;
}
