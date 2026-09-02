import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/AdminV3"));
const Watch = lazy(() => import("./pages/Watch"));
const Category = lazy(() => import("./pages/CategoryV2"));
const MovieFolder = lazy(() => import("./pages/MovieFolder"));
const Movies = lazy(() => import("./pages/CatalogBrowse"));
const Dramas = lazy(() => import("./pages/Dramas"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const Referral = lazy(() => import("./pages/Referral"));
const CricketHub = lazy(() => import("./pages/CricketHub"));

function PageFallback() {
  return <div className="grid min-h-screen place-items-center bg-[#0A0A0A] text-sm font-bold text-zinc-500">Loading ProMovie…</div>;
}

function Router() {
  return <Suspense fallback={<PageFallback />}><Switch><Route path="/" component={Home} /><Route path="/login" component={Login} /><Route path="/signup" component={SignUp} /><Route path="/ref/:id" component={Referral} /><Route path="/profile" component={Profile} /><Route path="/withdraw" component={Withdraw} /><Route path="/movies" component={Movies} /><Route path="/dramas" component={Dramas} /><Route path="/cricket" component={CricketHub} /><Route path="/admin" component={Admin} /><Route path="/category/:id" component={Category} /><Route path="/movie/:id" component={MovieFolder} /><Route path="/watch/:id" component={Watch} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
