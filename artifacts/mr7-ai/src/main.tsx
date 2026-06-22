import { createRoot } from "react-dom/client";
import { Router, Switch, Route } from "wouter";
import App from "./App";
import LandingPage from "./pages/landing";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import FAQPage from "./pages/faq";
import ContactPage from "./pages/contact";
import RoadmapPage from "./pages/roadmap";
import NotFound from "./pages/not-found";
import "./index.css";
import { initErrorMonitor } from "./lib/error-monitor";

// ── Initialize error monitoring ───────────────────────────────────────────────
initErrorMonitor();

// ── PWA Service Worker registration ──────────────────────────────────────────
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* silent */ });
  });
}

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_KEY as string | undefined;

if (INTERNAL_KEY) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith("/api/") || url.includes("/api/");
    if (isApi) {
      const headers = new Headers(init?.headers);
      headers.set("x-internal-key", INTERNAL_KEY);
      return _fetch(input, { ...init, headers });
    }
    return _fetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(
  <Router>
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={App} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route component={NotFound} />
    </Switch>
  </Router>
);
