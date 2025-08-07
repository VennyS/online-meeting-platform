"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { IUser } from "../types/auth.types";
import { authService } from "../services/auth.service";
import {
  removeAccessToken,
  saveAccessToken,
} from "../services/auth-token.service";

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

  React.useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const data = await authService.checkToken();
        saveAccessToken(data.token);
        setUser(data.user);
      } catch (error) {
        console.error("Ошибка при проверке токена:", error);
        removeAccessToken();
        router.replace("https://ru.noimann.academy/");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
