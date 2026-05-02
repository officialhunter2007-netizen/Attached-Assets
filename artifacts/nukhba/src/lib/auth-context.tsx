import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { UserProfile } from "@workspace/api-client-react";
import { useGetMe, useLogoutUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { clearAllNukhbaStorage, rotateUserIfChanged } from "@/lib/user-storage";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  authError: Error | null;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const { data: me, error, isLoading: isMeLoading } = useGetMe({
    query: {
      // queryKey is required by orval's generated type signature even though
      // the hook supplies its own internally — pass the canonical key here
      // to satisfy the type-checker without changing runtime behavior.
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const logoutMutation = useLogoutUser();

  useEffect(() => {
    if (isMeLoading) return;
    if (me) {
      // SECURITY: if a different user is now logged in on this browser, wipe
      // all per-user localStorage from the previous account before mounting
      // the new session. This is a defense-in-depth backstop in case any
      // storage key was missed.
      rotateUserIfChanged((me as any).id);
      setUser(me);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [me, isMeLoading]);

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      // SECURITY: wipe all nukhba-* localStorage entries so the next account
      // logging in on this browser cannot see chats, env state, IDE files,
      // or scenario progress from the previous account.
      clearAllNukhbaStorage();
      // Drop all React Query caches as well (any data cached in memory from
      // the previous session, e.g. lesson views, summaries, profile).
      queryClient.clear();
      setUser(null);
    }
  };

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, authError: error as Error | null, setUser, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
