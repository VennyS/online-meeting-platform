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
      "",
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

  it("should autojoin owner when conditions are met", async () => {
    const setToken = jest.fn();
    const user = {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john@doe.com",
      phoneNumber: "",
      role: "owner",
      roleId: 1,
      emailVerified: true,
      profileImage: "",
      isGuest: false,
    };

    mockHook(useUser, {
      user,
      setUser: jest.fn(),
      setToken,
      loading: false,
    });

    mockHook(usePrequisites, {
      prequisites: { isOwner: true, isFinished: false, cancelled: false },
      isLoading: false,
    });

    (authService.getToken as jest.Mock).mockResolvedValue({
      token: "owner-token",
    });

    renderHook(() => usePrejoin("room1"));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(authService.getToken).toHaveBeenCalledWith("room1", "John Doe");
    expect(setToken).toHaveBeenCalledWith("owner-token");
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should not autojoin when room is finished", async () => {
    const user = {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      isGuest: false,
    } as any;

    mockHook(useUser, {
      user,
      setUser: jest.fn(),
      setToken: jest.fn(),
      loading: false,
    });
    mockHook(usePrequisites, {
      prequisites: { isOwner: true, isFinished: true, cancelled: false },
      isLoading: false,
    });

    renderHook(() => usePrejoin("room1"));

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should not autojoin when room is cancelled", async () => {
    const user = {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      isGuest: false,
    } as any;

    mockHook(useUser, {
      user,
      setUser: jest.fn(),
      setToken: jest.fn(),
      loading: false,
    });
    mockHook(usePrequisites, {
      prequisites: { isOwner: true, isFinished: false, cancelled: true },
      isLoading: false,
    });

    renderHook(() => usePrejoin("room1"));

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should set countdown when startAt is in future", () => {
    const futureDate = new Date(Date.now() + 1000000).toISOString();

    mockHook(usePrequisites, {
      prequisites: { startAt: futureDate, allowEarlyJoin: false },
      isLoading: false,
    });

    jest.useFakeTimers();

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).not.toBeNull();
    expect(result.current.countdown?.days).toBeDefined();
    expect(result.current.countdown?.hours).toBeDefined();
    expect(result.current.countdown?.minutes).toBeDefined();
    expect(result.current.countdown?.seconds).toBeDefined();

    jest.useRealTimers();
  });

  it("should not set countdown when allowEarlyJoin is true", () => {
    const futureDate = new Date(Date.now() + 1000000).toISOString();

    mockHook(usePrequisites, {
      prequisites: { startAt: futureDate, allowEarlyJoin: true },
      isLoading: false,
    });

    const { result } = renderHook(() => usePrejoin("room1"));

    expect(result.current.countdown).toBeNull();
  });

  it("should set button disabled when no guest name provided", () => {
    const { result } = renderHook(() => usePrejoin("room1"));

    expect(result.current.buttonDisabled).toBe(true);
  });

  it("should set button disabled when password required but not provided", () => {
    mockHook(usePrequisites, {
      prequisites: { passwordRequired: true, waitingRoomEnabled: false },
      isLoading: false,
    });

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    expect(result.current.buttonDisabled).toBe(true);
  });

  it("should set field disabled when connecting", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();

    mockHook(useUser, {
      user: null,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ token: "abc123" }), 100)
        )
    );

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      result.current.handleJoin();
    });

    expect(result.current.fieldDisabled).toBe(true);
    expect(result.current.connecting).toBe(true);
  });

  it("should handle waiting room guest approved event", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();
    const mockSocket = {
      on: jest.fn((event, callback) => {
        if (event === "guest_approved") {
          setTimeout(
            () => callback({ guestId: 123, token: "waiting-token" }),
            0
          );
        }
      }),
    };

    mockHook(usePrequisites, {
      prequisites: { waitingRoomEnabled: true, passwordRequired: false },
      isLoading: false,
    });
    (connectSocket as jest.Mock).mockReturnValue(mockSocket);

    mockHook(useUser, {
      user: null,
      setUser,
      setToken,
      loading: false,
    });

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(setToken).toHaveBeenCalledWith("waiting-token");
    expect(setUser).toHaveBeenCalledWith({
      id: 123,
      firstName: "Guest",
      lastName: "",
      isGuest: true,
    });
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should handle waiting room guest rejected event", async () => {
    const mockSocket = {
      on: jest.fn((event, callback) => {
        if (event === "guest_rejected") {
          setTimeout(() => callback(), 0);
        }
      }),
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

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(result.current.error).toBe("Запрос отклонён");
    expect(result.current.connecting).toBe(false);
  });
});
