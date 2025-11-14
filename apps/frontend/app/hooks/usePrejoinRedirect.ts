import { useRouter } from "next/navigation";
import { usePrequisites } from "../providers/prequisites.provider";
import { useEffect } from "react";
import { usePrejoinStatusContext } from "../providers/prejoin-status.provider";
import { useUser } from "./useUser";

export function usePrejoinRedirect(roomShortId: string) {
  const router = useRouter();
  const { prequisites, isLoading } = usePrequisites();
  const { user, loading: isUserLoading } = useUser();
  const { isPassed } = usePrejoinStatusContext();

  useEffect(() => {
    if (isLoading || isUserLoading) return;

    if (isPassed(roomShortId)) return;

    const needsPrejoin =
      (prequisites.passwordRequired ||
        prequisites.waitingRoomEnabled ||
        (!prequisites.allowEarlyJoin &&
          new Date(prequisites.startAt) > new Date()) ||
        (prequisites.guestAllowed && !user)) &&
      !prequisites.isOwner;

    if (needsPrejoin) {
      router.replace(`/room/${roomShortId}/prejoin`);
    }
  }, [isLoading, prequisites, roomShortId, router]);
}
