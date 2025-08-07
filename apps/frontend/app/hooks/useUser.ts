import { useContext } from "react";
import { AuthContext } from "../providers/user.provider";

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context;
}
