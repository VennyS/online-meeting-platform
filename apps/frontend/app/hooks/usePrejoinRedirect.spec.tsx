import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { usePrequisites } from "../providers/prequisites.provider";
import { usePrejoinRedirect } from "./usePrejoinRedirect";
import { mockHook } from "../lib/test.lib";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../providers/prequisites.provider", () => ({
  usePrequisites: jest.fn(),
}));

function TestComponent({ roomShortId }: { roomShortId: string }) {
  usePrejoinRedirect(roomShortId);
  return null;
}

describe("usePrejoinRedirect", () => {
  it("should redirect to prejoin when prequisites require it", () => {
    const replace = jest.fn();

    mockHook(useRouter, { replace });

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

    mockHook(usePrequisites, {
      isLoading: true,
    });

    render(<TestComponent roomShortId="room1" />);

    expect(replace).not.toHaveBeenCalled();
  });
});
