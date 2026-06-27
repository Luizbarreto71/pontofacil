import * as React from "react";
import type { User } from "@/types";
import { authService, type SignUpInput } from "@/lib/supabase/authService";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  backendEnabled: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<User>;
  updatePassword: (newPassword: string) => Promise<void>;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(authService.enabled);

  // Hidrata a sessão do Supabase e escuta mudanças de auth
  React.useEffect(() => {
    if (!authService.enabled) {
      setLoading(false);
      return;
    }
    let mounted = true;
    authService.getSession().then((u) => {
      if (mounted) {
        setUser(u);
        setLoading(false);
      }
    });
    const unsub = authService.onAuthChange((u) => mounted && setUser(u));
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const u = await authService.signIn(email, password);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = React.useCallback(async () => {
    await authService.signInWithGoogle(); // redireciona
  }, []);

  const signUp = React.useCallback(async (input: SignUpInput) => {
    setLoading(true);
    try {
      const u = await authService.signUp(input);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePassword = React.useCallback(
    (newPassword: string) => authService.updatePassword(newPassword),
    []
  );

  const refreshUser = React.useCallback(async () => {
    setUser(await authService.getSession());
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    void authService.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        backendEnabled: authService.enabled,
        login,
        loginWithGoogle,
        signUp,
        updatePassword,
        setUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
