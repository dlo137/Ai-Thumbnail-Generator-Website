import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  entitlement: string | null;
  is_pro_version: boolean;
  is_trial_version: boolean;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  trial_end_date: string | null;
  price: number | null;
  last_credit_reset: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS =
  'id, name, email, entitlement, is_pro_version, is_trial_version, subscription_plan, subscription_start_date, trial_end_date, price, last_credit_reset';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      setProfile(null);
      return;
    }

    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    // Clears the dev-only "Simulate sign up" bypass too (see GeneratingPage /
    // App.tsx Layout) — without this, signing out would immediately re-bypass
    // back into AppShell since that flag isn't tied to the real session at all.
    sessionStorage.removeItem('dev_bypass_auth');
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  const deleteAccount = useCallback(async () => {
    sessionStorage.removeItem('dev_bypass_auth');

    // Force a fresh access token tied to a live session before this destructive
    // call — a cached token can outlive its backing session (e.g. after a
    // background refresh elsewhere rotates it), which the Edge Function's
    // getUser() correctly rejects even though the JWT itself isn't expired.
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw new Error(`Your session has expired. Please sign in again. (${refreshError.message})`);

    const { error } = await supabase.functions.invoke('delete-user');
    if (error) throw new Error(error.message);
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, profile, isLoading, signIn, signUp, signOut, deleteAccount, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
