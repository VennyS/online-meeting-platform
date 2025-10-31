import { createContext, ReactNode, useContext } from "react";
import {
  PresentationProviderValue,
  usePresentation,
} from "../hooks/usePresentation";
import { Socket } from "socket.io-client";

const PresentationContext = createContext<PresentationProviderValue | null>(
  null
);

interface PresentationProviderProps {
  socket: Socket | null;
  children: ReactNode;
}

export const PresentationProvider = ({
  socket,
  children,
}: PresentationProviderProps) => {
  const PresentationData = usePresentation(socket);

  return (
    <PresentationContext.Provider value={PresentationData}>
      {children}
    </PresentationContext.Provider>
  );
};

export function usePresentationContext() {
  const ctx = useContext(PresentationContext);
  if (!ctx) {
    throw new Error(
      "usePresentationContext must be used within PresentationProvider"
    );
  }
  return ctx;
}
