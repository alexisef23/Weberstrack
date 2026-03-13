import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/webertrack';
import { isSupabaseConfigured } from '../lib/supabase';
import * as sq from '../lib/supabaseQueries';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginAs: (user: User) => void;         // demo login
  loginWithEmail: (email: string, password: string) => Promise<void>; // real login
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount — check Supabase session or saved demo user
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      sq.getCurrentUser()
        .then(u => setUser(u))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const u = await sq.getCurrentUser();
          setUser(u);
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // Demo mode — restore from sessionStorage
      try {
        const saved = sessionStorage.getItem('wt_demo_user');
        if (saved) setUser(JSON.parse(saved));
      } catch {}
      setLoading(false);
    }
  }, []);

  const loginAs = (u: User) => {
    setUser(u);
    sessionStorage.setItem('wt_demo_user', JSON.stringify(u));
  };

  const loginWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
    await sq.signIn(email, password);
    const u = await sq.getCurrentUser();
    setUser(u);
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await sq.signOut();
    }
    sessionStorage.removeItem('wt_demo_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAs, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
