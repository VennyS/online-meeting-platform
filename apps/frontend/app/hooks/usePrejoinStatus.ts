import { useState } from "react";

export interface PrejoinStatusProviderValue {
  passedPrejoins: Set<string>;
  isPassed: (roomShortId: string) => boolean;
  markPrejoinPassed: (roomShortId: string) => void;
}

export function usePrejoinStatus(): PrejoinStatusProviderValue {
  const [passedPrejoins, setPassedPrejoins] = useState<Set<string>>(new Set());

  const isPassed = (roomShortId: string) => {
    return passedPrejoins.has(roomShortId);
  };

  const markPrejoinPassed = (roomShortId: string) => {
    setPassedPrejoins((prev) => new Set(prev).add(roomShortId));
  };

  return {
    passedPrejoins,
    isPassed,
    markPrejoinPassed,
  };
}
