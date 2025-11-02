import { useRouter } from "next/navigation";
import { usePrequisites } from "../providers/prequisites.provider";
import { useEffect } from "react";

export function usePrejoinRedirect(roomShortId: string) {
  const router = useRouter();
  const { prequisites, isLoading } = usePrequisites();

  useEffect(() => {
    if (isLoading) return;

    const needsPrejoin =
      (prequisites.passwordRequired ||
        prequisites.waitingRoomEnabled ||
        (!prequisites.allowEarlyJoin &&
          new Date(prequisites.startAt) > new Date())) &&
      !prequisites.isOwner;

    if (needsPrejoin) {
      router.replace(`/room/${roomShortId}/prejoin`);
    }
  }, [isLoading, prequisites, roomShortId, router]);
}
