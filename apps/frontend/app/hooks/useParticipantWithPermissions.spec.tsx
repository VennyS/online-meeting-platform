import { renderHook, act } from "@testing-library/react";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { mockHook } from "../lib/test.lib";
import { useParticipantsWithPermissions } from "./useParticipantWithPermissions";

jest.mock("@livekit/components-react");

describe("useParticipantsWithPermissions", () => {
  let socket: any;
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();

    eventHandlers = {};
    socket = {
      emit: jest.fn(),
      on: jest.fn((event: string, callback: Function) => {
        eventHandlers[event] = callback;
      }),
      off: jest.fn((event: string) => {
        delete eventHandlers[event];
      }),
    };

    mockHook(useLocalParticipant, {
      localParticipant: { identity: "1", name: "Alice" } as any,
    });
    mockHook(useRemoteParticipants, [
      { identity: "2", name: "Bob" } as any,
      { identity: "3", name: "Charlie" } as any,
    ]);
  });

  it("should initialize with local and remote participants with default permissions", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    expect(result.current.local.participant.identity).toBe("1");
    expect(result.current.local.permissions.role).toBe("participant");
    expect(result.current.remote.length).toBe(2);
    expect(result.current.remote[0].permissions.role).toBe("participant");
    expect(result.current.permissionsMap.owner.permissions.canShareScreen).toBe(
      true
    );
  });

  it("should emit update_permission via socket", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    act(() =>
      result.current.updateRolePermissions("admin", "canShareScreen", false)
    );
    expect(socket.emit).toHaveBeenCalledWith("update_permission", {
      targetRole: "admin",
      permission: "canShareScreen",
      value: false,
    });
  });

  it("should emit update_role via socket", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    act(() => result.current.updateUserRole("2", "admin"));
    expect(socket.emit).toHaveBeenCalledWith("update_role", {
      targetUserId: "2",
      newRole: "admin",
    });
  });

  it("should handle socket events for permissions_updated and role updates", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    // Get the event handlers that were registered during hook initialization
    const permissionsCallback = eventHandlers["permissions_updated"];
    const roleCallback = eventHandlers["role_updated"];

    expect(permissionsCallback).toBeDefined();
    expect(roleCallback).toBeDefined();

    // Update permissions for participant role
    act(() =>
      permissionsCallback({
        role: "participant",
        permissions: { canShareScreen: true },
      })
    );

    // Check that permissions were updated
    expect(
      result.current.permissionsMap.participant.permissions.canShareScreen
    ).toBe(true);

    // Update user role
    act(() => roleCallback({ role: "admin", userId: "2" }));

    // Check that user role was updated in remote participants
    const user2 = result.current.remote.find(
      (p) => p.participant.identity === "2"
    );
    expect(user2?.permissions.role).toBe("admin");
  });

  it("should handle permissions_init event", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    const permissionsInitCallback = eventHandlers["permissions_init"];

    act(() =>
      permissionsInitCallback({
        owner: { canShareScreen: true, canStartPresentation: true },
        admin: { canShareScreen: true, canStartPresentation: false },
        participant: { canShareScreen: false, canStartPresentation: false },
      })
    );

    expect(
      result.current.permissionsMap.admin.permissions.canStartPresentation
    ).toBe(false);
    expect(
      result.current.permissionsMap.participant.permissions.canShareScreen
    ).toBe(false);
  });

  it("should handle roles_updated event", () => {
    const { result } = renderHook(() => useParticipantsWithPermissions(socket));

    const rolesUpdatedCallback = eventHandlers["roles_updated"];

    act(() =>
      rolesUpdatedCallback({
        roles: {
          "1": "admin",
          "2": "participant",
          "3": "participant",
        },
      })
    );

    expect(result.current.local.permissions.role).toBe("admin");
    const user2 = result.current.remote.find(
      (p) => p.participant.identity === "2"
    );
    expect(user2?.permissions.role).toBe("participant");
  });
});
