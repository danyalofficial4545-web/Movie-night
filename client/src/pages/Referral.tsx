import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";

export default function Referral() {
  const [, params] = useRoute("/ref/:id");
  const [, setLocation] = useLocation();
  useEffect(() => { const id = Number(params?.id); if (Number.isInteger(id) && id > 0) window.sessionStorage.setItem("promovie_referrer_id", String(id)); setLocation("/signup"); }, [params?.id, setLocation]);
  return <div className="grid min-h-screen place-items-center bg-[#0A0A0A]"><LoaderCircle className="h-7 w-7 animate-spin text-[#E50914]" /></div>;
}
