import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  role: "user" | "admin";
  referralCode: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, referralCode: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const BAYI_KODU = "303603";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem("tutturduk_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, referralCode: string) => {
    // Admin backdoor for demo
    if (username === "admin" && referralCode === BAYI_KODU) {
      const adminUser: User = { id: "1", username: "Admin", role: "admin", referralCode };
      setUser(adminUser);
      localStorage.setItem("tutturduk_user", JSON.stringify(adminUser));
      return true;
    }

    // Regular user validation
    if (referralCode === BAYI_KODU) {
      const newUser: User = { 
        id: Math.random().toString(36).substr(2, 9), 
        username, 
        role: "user", 
        referralCode 
      };
      setUser(newUser);
      localStorage.setItem("tutturduk_user", JSON.stringify(newUser));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tutturduk_user");
    setLocation("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
