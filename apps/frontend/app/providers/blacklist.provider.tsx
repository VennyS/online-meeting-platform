import { createContext, ReactNode, useContext } from "react";
import { BlacklistProviderValue, useBlacklist } from "../hooks/useBlacklist";
import { Socket } from "socket.io-client";

const BlacklistContext = createContext<BlacklistProviderValue | null>(null);

interface BlacklistProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export const BlacklistProvider = ({
  socket,
  children,
}: BlacklistProviderProps) => {
  const blacklistData = useBlacklist(socket);

  return (
    <BlacklistContext.Provider value={blacklistData}>
      {children}
    </BlacklistContext.Provider>
  );
};

export function useBlacklistContext() {
  const ctx = useContext(BlacklistContext);
  if (!ctx) {
    throw new Error(
      "useBlacklistContext must be used within BlacklistProvider"
    );
  }
  return ctx;
}
