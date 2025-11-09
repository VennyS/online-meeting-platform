import { renderHook, act } from "@testing-library/react";
import { usePrejoin } from "./usePrejoin";
import { useUser } from "@/app/hooks/useUser";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { useRouter } from "next/navigation";
import { authService } from "@/app/services/auth.service";
import { connectSocket } from "@/app/config/connectSocket";
import { mockHook } from "../lib/test.lib";

jest.mock("@/app/hooks/useUser");
jest.mock("@/app/providers/prequisites.provider");
jest.mock("next/navigation");
jest.mock("@/app/services/auth.service");
jest.mock("@/app/config/connectSocket");

describe("usePrejoin", () => {
  let routerReplace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    routerReplace = jest.fn();
    mockHook(useRouter, { replace: routerReplace });
    mockHook(useUser, {
      user: null,
      setUser: jest.fn(),
      setToken: jest.fn(),
      loading: false,
    });
    mockHook(usePrequisites, {
      prequisites: { passwordRequired: false, waitingRoomEnabled: false },
      isLoading: false,
    });
  });

  it("should join normally when user provides a guest name", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();

    mockHook(useUser, {
      user: null,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockResolvedValue({ token: "abc123" });

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(authService.getToken).toHaveBeenCalledWith(
      "room1",
      "Guest",
      undefined,
      expect.any(Number)
    );
    expect(setToken).toHaveBeenCalledWith("abc123");
    expect(setUser).toHaveBeenCalled();
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should set error on wrong password", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();

    mockHook(useUser, {
      user: null,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockRejectedValue({
      response: { status: 401 },
    });

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(result.current.error).toBe("Неверный пароль");
    expect(result.current.connecting).toBe(false);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should connect via waiting room if enabled", async () => {
    const mockSocket = {
      on: jest.fn(),
    };
    mockHook(usePrequisites, {
      prequisites: { waitingRoomEnabled: true, passwordRequired: false },
      isLoading: false,
    });
    (connectSocket as jest.Mock).mockReturnValue(mockSocket);

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(connectSocket).toHaveBeenCalledWith("room1", "Guest");
    expect(mockSocket.on).toHaveBeenCalledWith(
      "guest_approved",
      expect.any(Function)
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      "guest_rejected",
      expect.any(Function)
    );
    expect(mockSocket.on).toHaveBeenCalledWith(
      "connect_error",
      expect.any(Function)
    );
  });
});
