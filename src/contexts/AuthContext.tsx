import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/api";
import { setCloudflareCsrfToken } from "@/integrations/cloudflare/client";

export interface CommunityUser {
  id: string;
  email: string;
  displayName: string;
  onboardingStatus: "PENDING" | "COMPLETED" | "DISMISSED";
  mustChangePassword: boolean;
  fixedSuperAdmin: boolean;
  roles: string[];
  permissions: string[];
}

interface AuthSession {
  expiresAt?: string;
}

export interface RegistrationProfile {
  phone?: string | null;
  institution: string;
  department: string;
  professionalStatus: "STUDENT" | "FACULTY" | "RESEARCHER" | "PROFESSIONAL" | "OTHER";
  consent: true;
}

interface AuthContextType {
  user: CommunityUser | null;
  session: AuthSession | null;
  loading: boolean;
  isAdmin: boolean;
  csrfToken: string | null;
  signUp: (email: string, password: string, displayName: string, turnstileToken: string, profile: RegistrationProfile) => Promise<{ error: Error | null; mustChangePassword?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; mustChangePassword?: boolean }>;
  signOut: () => Promise<void>;
  signOutAll: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const csrfRef = useRef<string | null>(null);

  const storeCsrf = useCallback((token: string | null) => {
    csrfRef.current = token;
    setCsrfToken(token);
    setCloudflareCsrfToken(token);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setSession(null);
    storeCsrf(null);
  }, [storeCsrf]);

  const refreshSession = useCallback(async () => {
    try {
      const result = await apiRequest<
        { authenticated: false } | { authenticated: true; user: CommunityUser; csrfToken: string }
      >("/auth/session");
      if (result.authenticated) {
        setUser(result.user);
        setSession({});
        storeCsrf(result.csrfToken);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    }
  }, [clearAuth, storeCsrf]);

  useEffect(() => {
    void refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const signUp = async (email: string, password: string, displayName: string, turnstileToken: string, profile: RegistrationProfile) => {
    try {
      await apiRequest("/auth/register", { method: "POST", body: { email, password, displayName, turnstileToken, ...profile } });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Registration failed.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await apiRequest<{ user: CommunityUser; csrfToken: string; expiresAt: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setUser(result.user);
      setSession({ expiresAt: result.expiresAt });
      storeCsrf(result.csrfToken);
      return { error: null, mustChangePassword: result.user.mustChangePassword };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error("Sign-in failed.") };
    }
  };

  const signOut = async () => {
    try {
      if (csrfRef.current) await apiRequest("/auth/logout", { method: "POST", csrfToken: csrfRef.current });
    } finally {
      clearAuth();
    }
  };

  const signOutAll = async () => {
    try {
      if (csrfRef.current) await apiRequest("/auth/logout-all", { method: "POST", csrfToken: csrfRef.current });
    } finally {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin: user?.permissions.includes("admin.access") ?? false,
        csrfToken,
        signUp,
        signIn,
        signOut,
        signOutAll,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
