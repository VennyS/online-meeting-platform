import React, { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useBlacklist, BlacklistEntry } from "./useBlacklist";

describe("useBlacklist", () => {
  let socket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    socket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  function TestComponent(props: { userId?: string }) {
    const { blacklist, addToBlackList, removeFromBlackList } =
      useBlacklist(socket);

    useEffect(() => {
      if (props.userId) addToBlackList(props.userId, "TestUser");
    }, [props.userId]);

    return <div data-testid="blacklist">{blacklist.length}</div>;
  }

  it("should initialize blacklist from socket events", () => {
    const initialBlacklist: BlacklistEntry[] = [
      { userId: "1", ip: "127.0.0.1", name: "Alice" },
    ];

    render(<TestComponent />);

    const initCallback = socket.on.mock.calls.find(
      ([event]: [string]) => event === "blacklist_init"
    )![1];

    act(() => {
      initCallback({ blacklist: initialBlacklist });
    });

    expect(socket.on).toHaveBeenCalledWith(
      "blacklist_init",
      expect.any(Function)
    );
    expect(socket.on).toHaveBeenCalledWith(
      "blacklist_updated",
      expect.any(Function)
    );
  });

  it("should call socket.emit when adding to blacklist", () => {
    render(<TestComponent userId="123" />);
    expect(socket.emit).toHaveBeenCalledWith("add_to_blacklist", {
      userId: "123",
      name: "TestUser",
    });
  });

  it("should call socket.emit when removing from blacklist", () => {
    function RemoveComponent() {
      const { removeFromBlackList } = useBlacklist(socket);
      useEffect(() => {
        removeFromBlackList("127.0.0.1");
      }, []);
      return null;
    }

    render(<RemoveComponent />);
    expect(socket.emit).toHaveBeenCalledWith("remove_from_blacklist", {
      ip: "127.0.0.1",
    });
  });

  it("should cleanup socket listeners on unmount", () => {
    const { unmount } = render(<TestComponent />);
    const initCallback = socket.on.mock.calls.find(
      ([event]: [string]) => event === "blacklist_init"
    )![1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith("blacklist_init", initCallback);
    expect(socket.off).toHaveBeenCalledWith("blacklist_updated", initCallback);
  });
});
