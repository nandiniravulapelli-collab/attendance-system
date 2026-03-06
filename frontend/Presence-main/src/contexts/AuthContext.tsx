import React, { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "faculty" | "student";
  departmentId?: string;
  rollNumber?: string;
  subjects?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    role: "admin" | "faculty" | "student"
  ) => Promise<{ success: true } | { success: false; error: string }>;
  logout: () => void;
  switchRole: (role: "admin" | "faculty" | "student") => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("attendanceUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // 🔥 LOGIN CONNECTED TO DJANGO (FIXED)
const login = async (
  email: string,
  password: string,
  role: "admin" | "faculty" | "student"
): Promise<{ success: true } | { success: false; error: string }> => {
  try {
    const response = await fetch(apiUrl("/api/login/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        role,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = getFirstError(data);
      return { success: false, error: message };
    }

    const loggedUser: User = {
      id: data.id != null ? String(data.id) : data.username,
      name: data.full_name || data.username,
      email: data.email,
      role: data.role,
      departmentId: data.department ?? "",
      rollNumber: data.username,
    };

    setUser(loggedUser);
    localStorage.setItem("attendanceUser", JSON.stringify(loggedUser));

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Network error. Is the backend running?" };
  }
};

function getFirstError(data: Record<string, unknown>): string {
  if (!data || typeof data !== "object") return "Invalid credentials.";
  const key = Object.keys(data)[0];
  if (!key) return "Invalid credentials.";
  const val = data[key];
  if (Array.isArray(val) && val.length) return String(val[0]);
  if (typeof val === "string") return val;
  return "Invalid credentials.";
}



  const logout = () => {
    setUser(null);
    localStorage.removeItem("attendanceUser");
  };

  // Temporary demo role switch (optional)
  const switchRole = (role: "admin" | "faculty" | "student") => {
    let demoUser: User;

    switch (role) {
      case "admin":
        demoUser = {
          id: "admin1",
          name: "System Administrator",
          email: "admin@university.edu",
          role: "admin",
        };
        break;
      case "faculty":
        demoUser = {
          id: "fac1",
          name: "Dr. Faculty",
          email: "faculty@university.edu",
          role: "faculty",
        };
        break;
      case "student":
      default:
        demoUser = {
          id: "std1",
          name: "Demo Student",
          email: "demo@student.edu",
          role: "student",
        };
        break;
    }

    setUser(demoUser);
    localStorage.setItem("attendanceUser", JSON.stringify(demoUser));
  };

  const value = {
    user,
    login,
    logout,
    switchRole,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
