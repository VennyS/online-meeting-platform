import { createContext, ReactNode, useContext } from "react";
import { Socket } from "socket.io-client";
import {
  useWaitingHost,
  WaitingRoomHostProviderValue,
} from "../hooks/useWaitingHost";

const WaitingHostContext = createContext<WaitingRoomHostProviderValue | null>(
  null
);

interface BlacklistProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export const WaitingHostProvider = ({
  socket,
  children,
}: BlacklistProviderProps) => {
  const waitingData = useWaitingHost(socket);

  return (
    <WaitingHostContext.Provider value={waitingData}>
      {children}
    </WaitingHostContext.Provider>
  );
};

export function useWaitingHostContext() {
  const ctx = useContext(WaitingHostContext);
  if (!ctx) {
    throw new Error(
      "useWaitingHostContext must be used within WaitingHostProvider"
    );
  }
  return ctx;
}
