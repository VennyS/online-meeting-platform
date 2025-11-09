import { renderHook, act } from "@testing-library/react";
import { useRoomLayout } from "./useRoomLayout";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useRoomTracksWithPresentations } from "./useRoomTracksWithPresentations";
import { isPresentation } from "../lib/isPresentations";
import { isTrackReferenceOrPlaceholder } from "../lib/isTrackReferenceOfPlaceholder";
import { Panel } from "../types/room-layout.types";

// Mock dependencies
jest.mock("@livekit/components-react");
jest.mock("./useRoomTracksWithPresentations");
jest.mock("../lib/isPresentations");
jest.mock("../lib/isTrackReferenceOfPlaceholder");

const mockRoom = {
  on: jest.fn(),
  off: jest.fn(),
};

const mockUseRoomTracksWithPresentations =
  useRoomTracksWithPresentations as jest.MockedFunction<
    typeof useRoomTracksWithPresentations
  >;
const mockIsPresentation = isPresentation as jest.MockedFunction<
  typeof isPresentation
>;
const mockIsTrackReferenceOrPlaceholder =
  isTrackReferenceOrPlaceholder as jest.MockedFunction<
    typeof isTrackReferenceOrPlaceholder
  >;

describe("useRoomLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRoomContext as jest.Mock).mockReturnValue(mockRoom);
    mockUseRoomTracksWithPresentations.mockReturnValue([]);
    mockIsPresentation.mockReturnValue(false);
    mockIsTrackReferenceOrPlaceholder.mockReturnValue(false);
  });

  it("should increase unreadCount when data received and panel not open", () => {
    let dataCallback: () => void;
    mockRoom.on.mockImplementation((event: RoomEvent, callback: () => void) => {
      if (event === RoomEvent.DataReceived) {
        dataCallback = callback;
      }
    });

    const { result } = renderHook(() => useRoomLayout());

    // Verify the callback was registered
    expect(mockRoom.on).toHaveBeenCalledWith(
      RoomEvent.DataReceived,
      expect.any(Function)
    );

    // Trigger the data callback
    act(() => {
      dataCallback();
    });

    expect(result.current.unreadCount).toBe(1);
  });

  it("should not increase unreadCount when data received and chat panel is open", () => {
    let dataCallback: () => void;
    mockRoom.on.mockImplementation((event: RoomEvent, callback: () => void) => {
      if (event === RoomEvent.DataReceived) {
        dataCallback = callback;
      }
    });

    const { result } = renderHook(() => useRoomLayout());

    // Open chat panel
    act(() => {
      result.current.handleChangeOpenPanel(Panel.Chat);
    });

    // Trigger the data callback
    act(() => {
      dataCallback();
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("should reset unread count when panel changes to chat", () => {
    let dataCallback: () => void;
    mockRoom.on.mockImplementation((event: RoomEvent, callback: () => void) => {
      if (event === RoomEvent.DataReceived) {
        dataCallback = callback;
      }
    });

    const { result } = renderHook(() => useRoomLayout());

    act(() => {
      dataCallback();
    });

    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.handleChangeOpenPanel(Panel.Chat);
    });

    expect(result.current.unreadCount).toBe(0);
  });

  it("should set isButtonNeeded to false when tracks length is less than 2", () => {
    mockUseRoomTracksWithPresentations.mockReturnValue([
      { id: "track1" },
    ] as any);

    const { result } = renderHook(() => useRoomLayout());

    expect(result.current.isButtonNeeded).toBe(false);
    expect(result.current.focusTrack).toBe(null);
  });

  it("should set isButtonNeeded to true when tracks length is 2 or more", () => {
    mockUseRoomTracksWithPresentations.mockReturnValue([
      { id: "track1" },
      { id: "track2" },
    ] as any);

    const { result } = renderHook(() => useRoomLayout());

    expect(result.current.isButtonNeeded).toBe(true);
  });

  it("should clear focus track when clearFocus is called", () => {
    const { result } = renderHook(() => useRoomLayout());

    act(() => {
      result.current.setFocusTrack({ id: "test-track" } as any);
    });

    expect(result.current.focusTrack).toEqual({ id: "test-track" });

    act(() => {
      result.current.clearFocus();
    });

    expect(result.current.focusTrack).toBe(null);
  });

  it("should toggle panel open/close when handleChangeOpenPanel is called", () => {
    const { result } = renderHook(() => useRoomLayout());

    expect(result.current.openedRightPanel).toBeUndefined();

    // Open panel
    act(() => {
      result.current.handleChangeOpenPanel(Panel.Chat);
    });

    expect(result.current.openedRightPanel).toBe(Panel.Chat);

    // Close panel when same panel is clicked
    act(() => {
      result.current.handleChangeOpenPanel(Panel.Chat);
    });

    expect(result.current.openedRightPanel).toBeUndefined();
  });

  it("should update focus track when tracks change and current focus is not available", () => {
    const mockTrack = {
      id: "track1",
      participant: { sid: "participant1" },
      publication: { trackSid: "track1" },
    };
    mockUseRoomTracksWithPresentations.mockReturnValue([mockTrack] as any);
    mockIsTrackReferenceOrPlaceholder.mockReturnValue(true);

    const { result } = renderHook(() => useRoomLayout());

    // Set initial focus
    act(() => {
      result.current.setFocusTrack(mockTrack as any);
    });

    expect(result.current.focusTrack).toEqual(mockTrack);

    // Change tracks to empty array
    mockUseRoomTracksWithPresentations.mockReturnValue([]);

    // Re-render with new tracks
    const { result: newResult } = renderHook(() => useRoomLayout());

    expect(newResult.current.focusTrack).toBe(null);
  });

  it("should return correct isFocused value", () => {
    const track1 = {
      id: "track1",
      participant: { sid: "participant1" },
      publication: { trackSid: "track1" },
    };
    const track2 = {
      id: "track2",
      participant: { sid: "participant2" },
      publication: { trackSid: "track2" },
    };

    mockIsTrackReferenceOrPlaceholder.mockReturnValue(true);

    const { result } = renderHook(() => useRoomLayout());

    // Set focus to track1
    act(() => {
      result.current.setFocusTrack(track1 as any);
    });

    // Check if track1 is focused
    expect(result.current.isFocused(track1 as any)).toBe(true);

    // Check if track2 is not focused
    expect(result.current.isFocused(track2 as any)).toBe(false);

    // Clear focus and check
    act(() => {
      result.current.clearFocus();
    });

    expect(result.current.isFocused(track1 as any)).toBe(false);
  });

  it("should cleanup event listeners on unmount", () => {
    const { unmount } = renderHook(() => useRoomLayout());

    unmount();

    expect(mockRoom.off).toHaveBeenCalledWith(
      RoomEvent.DataReceived,
      expect.any(Function)
    );
  });
});
