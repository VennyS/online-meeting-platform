import { renderHook, act } from "@testing-library/react";
import { usePrejoin } from "./usePrejoin";
import { useUser } from "@/app/hooks/useUser";
import { usePrequisites } from "@/app/providers/prequisites.provider";
import { usePrejoinStatusContext } from "../providers/prejoin-status.provider";
import { useRouter } from "next/navigation";
import { authService } from "@/app/services/auth.service";
import { connectSocket } from "@/app/config/connectSocket";
import { mockHook } from "../lib/test.lib";

jest.mock("@/app/hooks/useUser");
jest.mock("@/app/providers/prequisites.provider");
jest.mock("../providers/prejoin-status.provider");
jest.mock("next/navigation");
jest.mock("@/app/services/auth.service");
jest.mock("@/app/config/connectSocket");

describe("usePrejoin", () => {
  let routerReplace: jest.Mock;
  let markPrejoinPassed: jest.Mock;
  let isPassed: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    routerReplace = jest.fn();
    markPrejoinPassed = jest.fn();
    isPassed = jest.fn().mockReturnValue(false);

    mockHook(useRouter, { replace: routerReplace });
    mockHook(usePrejoinStatusContext, {
      passedPrejoins: new Set(),
      isPassed,
      markPrejoinPassed,
    });
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
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
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
    expect(markPrejoinPassed).not.toHaveBeenCalled();
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
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
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
    expect(markPrejoinPassed).not.toHaveBeenCalled();
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
    expect(markPrejoinPassed).not.toHaveBeenCalled();
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
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
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
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should handle waiting room connect error", async () => {
    const mockSocket = {
      on: jest.fn((event, callback) => {
        if (event === "connect_error") {
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

    expect(result.current.error).toBe("Ошибка подключения");
    expect(result.current.connecting).toBe(false);
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should use existing user name when user is logged in", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();
    const user = {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      isGuest: false,
    } as any;

    mockHook(useUser, {
      user,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockResolvedValue({ token: "abc123" });

    const { result } = renderHook(() => usePrejoin("room1"));

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(authService.getToken).toHaveBeenCalledWith(
      "room1",
      "John Doe",
      "",
      1
    );
    expect(setToken).toHaveBeenCalledWith("abc123");
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should not join when no name provided", async () => {
    const { result } = renderHook(() => usePrejoin("room1"));

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(result.current.connecting).toBe(false);
  });

  it("should not join when password required but not provided", async () => {
    mockHook(usePrequisites, {
      prequisites: { passwordRequired: true, waitingRoomEnabled: false },
      isLoading: false,
    });

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(result.current.connecting).toBe(false);
  });

  it("should handle generic join error", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();

    mockHook(useUser, {
      user: null,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      result.current.setGuestName("Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(result.current.error).toBe("Ошибка входа");
    expect(result.current.connecting).toBe(false);
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should clear countdown when meeting start time is reached", () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();

    mockHook(usePrequisites, {
      prequisites: { startAt: pastDate, allowEarlyJoin: false },
      isLoading: false,
    });

    jest.useFakeTimers();

    const { result } = renderHook(() => usePrejoin("room1"));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.countdown).toBeNull();

    jest.useRealTimers();
  });

  it("should not autojoin when user is guest", async () => {
    const user = {
      id: 1,
      firstName: "Guest",
      lastName: "User",
      isGuest: true,
    } as any;

    mockHook(useUser, {
      user,
      setUser: jest.fn(),
      setToken: jest.fn(),
      loading: false,
    });

    mockHook(usePrequisites, {
      prequisites: { isOwner: true, isFinished: false, cancelled: false },
      isLoading: false,
    });

    renderHook(() => usePrejoin("room1"));

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should not autojoin when user is not loaded", async () => {
    mockHook(useUser, {
      user: null,
      setUser: jest.fn(),
      setToken: jest.fn(),
      loading: true,
    });

    mockHook(usePrequisites, {
      prequisites: { isOwner: true, isFinished: false, cancelled: false },
      isLoading: false,
    });

    renderHook(() => usePrejoin("room1"));

    expect(authService.getToken).not.toHaveBeenCalled();
    expect(markPrejoinPassed).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("should set user data when joining as guest", async () => {
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
      result.current.setGuestName("New Guest");
    });

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(setUser).toHaveBeenCalledWith({
      id: expect.any(Number),
      firstName: "New Guest",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "guest",
      roleId: 0,
      emailVerified: false,
      profileImage: "",
      isGuest: true,
    });
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should not set user data when user already exists", async () => {
    const setToken = jest.fn();
    const setUser = jest.fn();
    const user = {
      id: 1,
      firstName: "Existing",
      lastName: "User",
      isGuest: false,
    } as any;

    mockHook(useUser, {
      user,
      setUser,
      setToken,
      loading: false,
    });

    (authService.getToken as jest.Mock).mockResolvedValue({ token: "abc123" });

    const { result } = renderHook(() => usePrejoin("room1"));

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(setUser).not.toHaveBeenCalled();
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should clear error when handleJoin is called", async () => {
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

    // Сначала устанавливаем ошибку через неудачный запрос
    (authService.getToken as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    await act(async () => {
      await result.current.handleJoin();
    });

    expect(result.current.error).toBe("Ошибка входа");

    // Теперь делаем успешный запрос
    (authService.getToken as jest.Mock).mockResolvedValue({ token: "abc123" });

    await act(async () => {
      await result.current.handleJoin();
    });

    // Ошибка должна очиститься при новом вызове handleJoin
    expect(result.current.error).toBe("");
    expect(markPrejoinPassed).toHaveBeenCalledWith("room1");
    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should redirect to room when prejoin already passed", () => {
    isPassed.mockReturnValue(true);

    renderHook(() => usePrejoin("room1"));

    expect(routerReplace).toHaveBeenCalledWith("/room/room1");
  });

  it("should not redirect to room when prejoin not passed", () => {
    isPassed.mockReturnValue(false);

    renderHook(() => usePrejoin("room1"));

    expect(routerReplace).not.toHaveBeenCalled();
  });
});
