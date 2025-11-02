"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { envConfig } from "@/app/config/config";

export function useRoomGuard(roomShortId: string) {
  const router = useRouter();
  const { user, loading: isUserLoading } = useUser();
  const { prequisites, isLoading: isPreqLoading } = usePrequisites();

  useEffect(() => {
    if (isPreqLoading && isUserLoading) return;

    if (prequisites.isBlackListed) {
      router.replace("/404");
      return;
    }

    if (prequisites.isFinished) {
      router.replace(`/room/${roomShortId}/ended`);
      return;
    }

    if (prequisites.cancelled) {
      router.replace(`/room/${roomShortId}/cancelled`);
      return;
    }

    if (!prequisites.guestAllowed && !user) {
      router.replace(envConfig.platformUrl);
      return;
    }
  }, [isPreqLoading, isUserLoading, prequisites, user, roomShortId, router]);
}
