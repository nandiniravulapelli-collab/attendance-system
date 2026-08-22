/**
 * Backend API base URL. Uses the same host as the page so session cookies work
 * (e.g. open app at http://localhost:5173 and backend at http://localhost:8000).
 */
export const API_BASE = "https://attendance-system-1-kbyb.onrender.com";


export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${API_BASE.endsWith("/") ? p.slice(1) : p}`;
}

/**
 * Get auth headers with JWT token if available
 */
export function getAuthHeaders(): Record<string, string> {
  const storedUser = localStorage.getItem("attendanceUser");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.accessToken) {
        return {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.accessToken}`
        };
      }
    } catch (e) {
      console.error("Error parsing stored user:", e);
    }
  }
  return {
    "Content-Type": "application/json"
  };
}

/**
 * Refresh JWT token if expired
 */
export async function refreshAccessToken(): Promise<string | null> {
  const storedUser = localStorage.getItem("attendanceUser");
  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    if (!user.refreshToken) return null;

    const response = await fetch(apiUrl("/api/token/refresh/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh: user.refreshToken
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const updatedUser = {
        ...user,
        accessToken: data.access,
        refreshToken: data.refresh || user.refreshToken
      };
      localStorage.setItem("attendanceUser", JSON.stringify(updatedUser));
      return data.access;
    } else {
      // Refresh failed, logout user
      localStorage.removeItem("attendanceUser");
      return null;
    }
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Authenticated fetch wrapper with automatic token refresh
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders();
  let response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  // If 401, try to refresh token and retry
  if (response.status === 401) {
    console.log("Token expired, attempting refresh");
    const newToken = await refreshAccessToken();
    if (newToken) {
      console.log("Token refreshed, retrying request");
      const newHeaders = getAuthHeaders();
      response = await fetch(url, {
        ...options,
        headers: {
          ...newHeaders,
          ...options.headers
        }
      });
    }
  }

  return response;
}
