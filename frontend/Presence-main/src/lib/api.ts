/**
 * Backend API base URL. Uses the same host as the page so session cookies work
 * (e.g. open app at http://localhost:5173 and backend at http://localhost:8000).
 */
export const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://127.0.0.1:8000";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${API_BASE.endsWith("/") ? p.slice(1) : p}`;
}
