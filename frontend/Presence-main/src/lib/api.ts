/**
 * Backend API base URL. Uses the same host as the page so session cookies work
 * (e.g. open app at http://localhost:5173 and backend at http://localhost:8000).
 */
export const API_BASE = "https://attendance-system-1-kbyb.onrender.com";


export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${API_BASE.endsWith("/") ? p.slice(1) : p}`;
}
