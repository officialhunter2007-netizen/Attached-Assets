import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { UserProfile } from "@workspace/api-client-react/generated/api.schemas";
import { useGetMe, useLogoutUser } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

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
      retry: false,
    }
  });

  const logoutMutation = useLogoutUser();

  useEffect(() => {
    if (isMeLoading) return;
    if (me) {
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
