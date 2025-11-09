import React from "react";
import { render, renderHook, act } from "@testing-library/react";
import { useChat } from "./useChat";
import { useUser } from "./useUser";
import { useChat as useLivekitChat } from "@livekit/components-react";
import { mockHook } from "../lib/test.lib";

jest.mock("./useUser");
jest.mock("@livekit/components-react");

describe("useChat", () => {
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
    const chat = useChat(socket);
    return <div data-testid="messages">{chat.messages.length}</div>;
  }

  it("should initialize messages from socket", async () => {
    const initialMessages = [
      {
        id: 1,
        text: "Hello",
        user: { id: 1, firstName: "Alice" },
        createdAt: new Date(),
      },
    ];

    mockHook(useUser, { user: { id: 2, firstName: "Bob" } });
    mockHook(useLivekitChat, { send: jest.fn(), chatMessages: [] });

    render(<TestComponent />);

    const initCallback = socket.on.mock.calls.find(
      ([eventName]: [string]) => eventName === "init_chat"
    )![1];

    await act(async () => {
      initCallback({ messages: initialMessages });
    });

    expect(socket.on).toHaveBeenCalledWith("init_chat", expect.any(Function));
  });

  it("should send message via socket and livekit", async () => {
    const sendLivekitMessage = jest.fn();
    mockHook(useUser, { user: { id: 2, firstName: "Bob" } });
    mockHook(useLivekitChat, { send: sendLivekitMessage, chatMessages: [] });

    const { result } = renderHook(() => useChat(socket));

    await act(async () => {
      // @ts-ignore
      result.current.send("Hi there");
    });

    expect(sendLivekitMessage).toHaveBeenCalledWith("Hi there");
    expect(socket.emit).toHaveBeenCalledWith("new_message", {
      message: {
        text: "Hi there",
        user: { id: 2, firstName: "Bob" },
      },
    });
  });

  it("should not send empty message", async () => {
    const sendLivekitMessage = jest.fn();
    mockHook(useUser, { user: { id: 2, firstName: "Bob" } });
    mockHook(useLivekitChat, { send: sendLivekitMessage, chatMessages: [] });

    const { result } = renderHook(() => useChat(socket));

    await act(async () => {
      // @ts-ignore
      result.current.send("  ");
    });

    expect(sendLivekitMessage).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("should merge livekit messages with local messages", async () => {
    const livekitMsg = {
      id: "lk1",
      message: "Hello from LK",
      from: { identity: "3", name: "Charlie" },
      timestamp: Date.now(),
    };

    mockHook(useUser, { user: { id: 2, firstName: "Bob" } });
    mockHook(useLivekitChat, { send: jest.fn(), chatMessages: [livekitMsg] });

    let result: any;
    await act(async () => {
      ({ result } = renderHook(() => useChat(socket)));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.messages).toEqual([
      {
        id: "lk1",
        text: "Hello from LK",
        user: { id: 3, firstName: "Charlie" },
        createdAt: new Date(livekitMsg.timestamp),
      },
    ]);
  });

  it("should cleanup socket listeners on unmount", async () => {
    mockHook(useUser, { user: { id: 2, firstName: "Bob" } });
    mockHook(useLivekitChat, { send: jest.fn(), chatMessages: [] });

    const { unmount } = renderHook(() => useChat(socket));

    await act(async () => {
      unmount();
    });

    expect(socket.off).toHaveBeenCalled();
  });
});
