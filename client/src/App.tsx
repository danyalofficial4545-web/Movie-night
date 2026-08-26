import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import VerifyOtp from "./pages/VerifyOtp";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Watch from "./pages/Watch";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/login" component={Login} /><Route path="/signup" component={SignUp} /><Route path="/verify-otp" component={VerifyOtp} /><Route path="/profile" component={Profile} /><Route path="/admin" component={Admin} /><Route path="/watch/:id" component={Watch} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
