import { renderHook } from "@testing-library/react";
import { useRoomGuard } from "./useRoomGuard";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/hooks/useUser";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { envConfig } from "@/app/config/config";
import { mockHook } from "../lib/test.lib";

jest.mock("next/navigation");
jest.mock("@/app/hooks/useUser");
jest.mock("@/app/providers/prequisites.provider");

describe("useRoomGuard", () => {
  let replace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    replace = jest.fn();
    mockHook(useRouter, { replace });
  });

  it("redirects to /404 if user is blacklisted", () => {
    mockHook(usePrequisites, {
      prequisites: { isBlackListed: true } as any,
      isLoading: false,
    });
    mockHook(useUser, { user: null, loading: false });

    renderHook(() => useRoomGuard("room1"));

    expect(replace).toHaveBeenCalledWith("/404");
  });

  it("redirects to /ended if room is finished", () => {
    mockHook(usePrequisites, {
      prequisites: { isFinished: true } as any,
      isLoading: false,
    });
    mockHook(useUser, { user: null, loading: false });

    renderHook(() => useRoomGuard("room123"));

    expect(replace).toHaveBeenCalledWith("/room/room123/ended");
  });

  it("redirects to /cancelled if room is cancelled", () => {
    mockHook(usePrequisites, {
      prequisites: { cancelled: true } as any,
      isLoading: false,
    });
    mockHook(useUser, { user: null, loading: false });

    renderHook(() => useRoomGuard("roomXYZ"));

    expect(replace).toHaveBeenCalledWith("/room/roomXYZ/cancelled");
  });

  it("redirects to platform URL if guest not allowed and no user", () => {
    mockHook(usePrequisites, {
      prequisites: { guestAllowed: false } as any,
      isLoading: false,
    });
    mockHook(useUser, { user: null, loading: false });

    renderHook(() => useRoomGuard("room1"));

    expect(replace).toHaveBeenCalledWith(envConfig.platformUrl);
  });

  it("does not redirect if prequisites and user loading", () => {
    mockHook(usePrequisites, { prequisites: {}, isLoading: true });
    mockHook(useUser, { user: null, loading: true });

    renderHook(() => useRoomGuard("room1"));

    expect(replace).not.toHaveBeenCalled();
  });

  it("does not redirect if user present and guestAllowed true", () => {
    mockHook(usePrequisites, {
      prequisites: { guestAllowed: true } as any,
      isLoading: false,
    });
    mockHook(useUser, {
      user: { id: 1, firstName: "Test" } as any,
      loading: false,
    });

    renderHook(() => useRoomGuard("room1"));

    expect(replace).not.toHaveBeenCalled();
  });
});
