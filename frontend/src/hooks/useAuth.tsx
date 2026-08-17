import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserMe } from '../types/api';
import { getMe, login as loginApi, logout as logoutApi } from '../services/auth.service';
import { setToken, clearToken, getToken } from '../lib/api-client';

interface AuthState {
  user: UserMe | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (login_id: string, password: string) => Promise<{ requires_password_change: boolean; role: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const user = await getMe();
      setState({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearToken();
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (login_id: string, password: string) => {
    const res = await loginApi(login_id, password);
    setToken(res.access_token);

    const user = await getMe();
    setState({ user, isAuthenticated: true, isLoading: false });

    return { requires_password_change: res.requires_password_change, role: res.role };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Server-side logout is best-effort for stateless JWT
    }
    clearToken();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
