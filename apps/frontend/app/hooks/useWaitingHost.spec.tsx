import React, { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useWaitingHost, IWaitingGuest } from "./useWaitingHost";

describe("useWaitingHost", () => {
  let socket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    socket = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  function TestComponent() {
    const { waitingGuests, approveGuest, rejectGuest } = useWaitingHost(socket);

    useEffect(() => {
      if (waitingGuests.length > 0) {
        approveGuest(waitingGuests[0].guestId);
        rejectGuest(waitingGuests[0].guestId);
      }
    }, [waitingGuests]);

    return <div data-testid="count">{waitingGuests.length}</div>;
  }

  it("should initialize waiting guests from socket", () => {
    const initialGuests: IWaitingGuest[] = [
      { guestId: "1", name: "Alice", requestedAt: "2025-11-09T12:00:00Z" },
    ];

    render(<TestComponent />);

    const callback = socket.on.mock.calls.find(
      ([event]: [string]) => event === "waiting_queue_updated"
    )![1];

    act(() => {
      callback({ guests: initialGuests });
    });

    expect(socket.on).toHaveBeenCalledWith(
      "waiting_queue_updated",
      expect.any(Function)
    );
  });

  it("should call socket.emit when approving guest", () => {
    const guests: IWaitingGuest[] = [
      { guestId: "42", name: "Bob", requestedAt: "2025-11-09T12:00:00Z" },
    ];

    function ApproveComponent() {
      const { approveGuest } = useWaitingHost(socket);
      useEffect(() => {
        approveGuest(guests[0].guestId);
      }, []);
      return null;
    }

    render(<ApproveComponent />);
    expect(socket.emit).toHaveBeenCalledWith("host_approval", {
      guestId: "42",
      approved: true,
    });
  });

  it("should call socket.emit when rejecting guest", () => {
    const guests: IWaitingGuest[] = [
      { guestId: "99", name: "Eve", requestedAt: "2025-11-09T12:00:00Z" },
    ];

    function RejectComponent() {
      const { rejectGuest } = useWaitingHost(socket);
      useEffect(() => {
        rejectGuest(guests[0].guestId);
      }, []);
      return null;
    }

    render(<RejectComponent />);
    expect(socket.emit).toHaveBeenCalledWith("host_approval", {
      guestId: "99",
      approved: false,
    });
  });

  it("should cleanup socket listeners on unmount", () => {
    const { unmount } = render(<TestComponent />);

    const callback = socket.on.mock.calls.find(
      ([event]: [string]) => event === "waiting_queue_updated"
    )![1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith("waiting_queue_updated", callback);
  });
});
