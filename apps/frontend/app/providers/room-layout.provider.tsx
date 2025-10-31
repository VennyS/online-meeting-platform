import { createContext, ReactNode, useContext } from "react";
import { RoomLayoutProviderValue, useRoomLayout } from "../hooks/useRoomLayout";

const RoomLayoutContext = createContext<RoomLayoutProviderValue | null>(null);

interface RoomLayoutProviderProps {
  children: ReactNode;
}

export const RoomLayoutProvider = ({ children }: RoomLayoutProviderProps) => {
  const RoomLayoutData = useRoomLayout();

  return (
    <RoomLayoutContext.Provider value={RoomLayoutData}>
      {children}
    </RoomLayoutContext.Provider>
  );
};

export function useRoomLayoutContext() {
  const ctx = useContext(RoomLayoutContext);
  if (!ctx) {
    throw new Error(
      "useRoomLayoutContext must be used within RoomLayoutProvider"
    );
  }
  return ctx;
}
