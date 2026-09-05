import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { resolveCentralUser } from "@/lib/xcamp-api";
import type { XcampUser } from "@/types/xcamp";

interface AuthContextValue {
  user: XcampUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ user: { id: string; email?: string } | null; session: unknown | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function buildXcampUser(authUserId: string, email?: string): Promise<XcampUser> {
  const cu = await resolveCentralUser(authUserId);
  const prefs =
    cu.preferences && typeof cu.preferences === "object" && !Array.isArray(cu.preferences)
      ? (cu.preferences as Record<string, unknown>)
      : {};
  return {
    authId: authUserId,
    centralId: cu.id,
    tenantId: cu.tenant_id,
    displayName: cu.display_name ?? cu.email ?? "User",
    email: cu.email ?? email,
    avatarUrl: typeof prefs.avatar_url === "string" ? prefs.avatar_url : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<XcampUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on load + react to auth changes.
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        try {
          const xu = await buildXcampUser(session.user.id, session.user.email ?? undefined);
          if (active) setUser(xu);
        } catch (e) {
          if (active) setError((e as Error).message);
        }
      }
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        buildXcampUser(session.user.id, session.user.email ?? undefined)
          .then((xu) => setUser(xu))
          .catch((e) => setError((e as Error).message));
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      throw authError;
    }
    const xu = await buildXcampUser(data.user.id, data.user.email ?? undefined);
    setUser(xu);
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (authError) {
      setError(authError.message);
      throw authError;
    }
    return {
      user: data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null,
      session: data.session,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return;
    const xu = await buildXcampUser(authUser.id, authUser.email ?? undefined);
    setUser(xu);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
