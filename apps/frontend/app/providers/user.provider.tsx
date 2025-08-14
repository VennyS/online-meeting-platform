"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IUser } from "../types/auth.types";
import { authService } from "../services/auth.service";
import {
  removeAccessToken,
  saveAccessToken,
} from "../services/auth-token.service";
import { usePathname } from "next/navigation";

interface AuthContextType {
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  loading: boolean;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<IUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isRoomPage = pathname?.startsWith("/room/") ?? false;

  React.useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const data = await authService.checkToken();
        saveAccessToken(data.token);
        setUser(data.user);
      } catch (error) {
        if (!isRoomPage) {
          removeAccessToken();
          router.replace("https://ru.noimann.academy/");
        }
        // Если это публичная комната, просто оставляем user = null
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, pathname]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
