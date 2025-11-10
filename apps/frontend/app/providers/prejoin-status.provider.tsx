import { createContext, useContext } from "react";
import {
  PrejoinStatusProviderValue,
  usePrejoinStatus,
} from "../hooks/usePrejoinStatus";

const PrejoinStatusContext = createContext<
  PrejoinStatusProviderValue | undefined
>(undefined);

export const PrejoinStatusProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const prejoinStatusData = usePrejoinStatus();

  return (
    <PrejoinStatusContext.Provider value={prejoinStatusData}>
      {children}
    </PrejoinStatusContext.Provider>
  );
};

export const usePrejoinStatusContext = () => {
  const context = useContext(PrejoinStatusContext);
  if (!context) {
    throw new Error("usePrejoinStatus must be used within PrejoinProvider");
  }
  return context;
};
