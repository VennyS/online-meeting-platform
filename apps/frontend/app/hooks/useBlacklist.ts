import { useEffect, useState } from "react";
import { RoomSocket } from "../providers/websocket.provider";

export interface BlacklistProviderValue {
  blacklist: BlacklistEntry[];
  addToBlackList(userId: string, username: string): void;
  removeFromBlackList(ip: string): void;
}

export interface BlacklistEntry {
  userId: string | undefined;
  ip: string;
  name: string;
}

export function useBlacklist(
  socket: RoomSocket | null
): BlacklistProviderValue {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);

  function addToBlackList(userId: string, username: string) {
    console.log(socket);

    socket?.emit("add_to_blacklist", { userId, name: username });
  }

  function removeFromBlackList(ip: string) {
    socket?.emit("remove_from_blacklist", { ip });
  }

  useEffect(() => {
    if (!socket) return;

    const onBlacklistInit = (data: { blacklist: BlacklistEntry[] }) => {
      setBlacklist(data.blacklist);
    };

    socket.on("blacklist_init", onBlacklistInit);
    socket.on("blacklist_updated", onBlacklistInit);

    return () => {
      socket.off("blacklist_init", onBlacklistInit);
      socket.off("blacklist_updated", onBlacklistInit);
    };
  });

  return {
    blacklist,
    addToBlackList,
    removeFromBlackList,
  };
}
