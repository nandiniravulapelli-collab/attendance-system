import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { API_BASE } from "./lib/api";

// Global guard: always send cookies for backend API requests.
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith(API_BASE)) {
    return originalFetch(input, { ...(init || {}), credentials: "include" });
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
