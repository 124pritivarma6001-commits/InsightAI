import { useCallback, useEffect, useState } from "react";
import { authApi } from "../services/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
}

/**
 * Core auth state logic backed by localStorage's JWT. Wrapped in a React
 * Context (see AuthContext.tsx) so every component reading `useAuth()`
 * shares the same login state instead of each mounting its own copy.
 */
export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    await authApi.login(email, password);
    await refresh();
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await authApi.register(email, password, fullName);
    await login(email, password);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}
