import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { clearProMovieToken, getProMovieToken } from "@/lib/promovieSession";

export function useProMovieMember() {
  const [, setLocation] = useLocation();
  const token = getProMovieToken();
  const query = trpc.promovie.auth.me.useQuery({ token: token || "missing-session-token" }, { enabled: Boolean(token), retry: false });

  useEffect(() => {
    if (!token || query.isError) {
      if (query.isError) clearProMovieToken();
      setLocation("/login");
    }
  }, [query.isError, setLocation, token]);

  return { token, ...query };
}

export function ProMovieGuard({ children }: { children: React.ReactNode }) {
  const { data: member, isLoading, token } = useProMovieMember();
  if (!token || isLoading || !member) {
    return <div className="grid min-h-screen place-items-center bg-[#0A0A0A]"><LoaderCircle className="h-7 w-7 animate-spin text-[#E50914]" /></div>;
  }
  return <>{children}</>;
}
