import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { usePrequisites } from "../providers/prequisites.provider";
import { usePrejoinStatusContext } from "../providers/prejoin-status.provider";
import { usePrejoinRedirect } from "./usePrejoinRedirect";
import { mockHook } from "../lib/test.lib";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../providers/prequisites.provider", () => ({
  usePrequisites: jest.fn(),
}));

jest.mock("../providers/prejoin-status.provider", () => ({
  usePrejoinStatusContext: jest.fn(),
}));

function TestComponent({ roomShortId }: { roomShortId: string }) {
  usePrejoinRedirect(roomShortId);
  return null;
}

describe("usePrejoinRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to prejoin when prequisites require it", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: true,
        waitingRoomEnabled: false,
        allowEarlyJoin: true,
        startAt: new Date().toISOString(),
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="abc" />);

    expect(replace).toHaveBeenCalledWith("/room/abc/prejoin");
  });

  it("should NOT redirect when nothing required", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: false,
        waitingRoomEnabled: false,
        allowEarlyJoin: true,
        startAt: new Date().toISOString(),
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="xyz" />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("should NOT redirect while loading", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: true,
    });

    render(<TestComponent roomShortId="room1" />);

    expect(replace).not.toHaveBeenCalled();
  });

  // Новые тесты для проверки логики isPassed
  it("should NOT redirect when prejoin already passed for this room", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, {
      isPassed: (roomId: string) => roomId === "passed-room",
    });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: true, // Требуется prejoin
        waitingRoomEnabled: false,
        allowEarlyJoin: true,
        startAt: new Date().toISOString(),
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="passed-room" />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("should redirect when prejoin NOT passed for this room", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, {
      isPassed: (roomId: string) => roomId === "other-room", // passed для другой комнаты
    });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: true, // Требуется prejoin
        waitingRoomEnabled: false,
        allowEarlyJoin: true,
        startAt: new Date().toISOString(),
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="current-room" />);

    expect(replace).toHaveBeenCalledWith("/room/current-room/prejoin");
  });

  it("should NOT redirect when user is owner", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: true, // Требуется prejoin, но...
        waitingRoomEnabled: true, // ...владелец проходит всегда
        allowEarlyJoin: false,
        startAt: new Date(Date.now() + 3600000).toISOString(), // встреча через час
        isOwner: true, // Владелец!
      },
    });

    render(<TestComponent roomShortId="owner-room" />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("should redirect when waiting room enabled", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: false,
        waitingRoomEnabled: true, // Зал ожидания включен
        allowEarlyJoin: true,
        startAt: new Date().toISOString(),
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="waiting-room" />);

    expect(replace).toHaveBeenCalledWith("/room/waiting-room/prejoin");
  });

  it("should redirect when meeting not started yet and early join not allowed", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: false,
        waitingRoomEnabled: false,
        allowEarlyJoin: false, // Ранний вход запрещен
        startAt: new Date(Date.now() + 3600000).toISOString(), // встреча через час
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="future-room" />);

    expect(replace).toHaveBeenCalledWith("/room/future-room/prejoin");
  });

  it("should NOT redirect when meeting not started but early join allowed", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: false,
        waitingRoomEnabled: false,
        allowEarlyJoin: true, // Ранний вход разрешен
        startAt: new Date(Date.now() + 3600000).toISOString(), // встреча через час
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="early-room" />);

    expect(replace).not.toHaveBeenCalled();
  });

  it("should handle multiple prequisite requirements", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });
    mockHook(usePrequisites, {
      isLoading: false,
      prequisites: {
        passwordRequired: true, // И пароль
        waitingRoomEnabled: true, // И зал ожидания
        allowEarlyJoin: false, // И встреча еще не началась
        startAt: new Date(Date.now() + 7200000).toISOString(), // через 2 часа
        isOwner: false,
      },
    });

    render(<TestComponent roomShortId="multi-room" />);

    expect(replace).toHaveBeenCalledWith("/room/multi-room/prejoin");
  });

  it("should work correctly when prequisites change", () => {
    const replace = jest.fn();

    const prequisitesStates = [
      {
        isLoading: false,
        prequisites: {
          passwordRequired: false,
          waitingRoomEnabled: false,
          allowEarlyJoin: true,
          startAt: new Date().toISOString(),
          isOwner: false,
        },
      },
      {
        isLoading: false,
        prequisites: {
          passwordRequired: true, // Теперь требуется пароль
          waitingRoomEnabled: false,
          allowEarlyJoin: true,
          startAt: new Date().toISOString(),
          isOwner: false,
        },
      },
    ];

    let callCount = 0;

    mockHook(useRouter, { replace });
    mockHook(usePrejoinStatusContext, { isPassed: () => false });

    // Мокаем usePrequisites чтобы он возвращал разные состояния при каждом вызове
    (usePrequisites as jest.Mock).mockImplementation(
      () => prequisitesStates[callCount++]
    );

    const { rerender } = render(<TestComponent roomShortId="dynamic-room" />);

    // Первый рендер - не должно быть редиректа
    expect(replace).not.toHaveBeenCalled();

    // Принудительно обновляем компонент
    rerender(<TestComponent roomShortId="dynamic-room" />);

    // Второй рендер - должен быть редирект
    expect(replace).toHaveBeenCalledWith("/room/dynamic-room/prejoin");
  });
});
