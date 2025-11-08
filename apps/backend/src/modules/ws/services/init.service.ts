import { Injectable } from '@nestjs/common';

@Injectable()
export class InitService {
  private socketStates = new Map<
    string,
    {
      ready: boolean;
      resolveReady: () => void;
      readyPromise: Promise<void>;
    }
  >();

  markNotReady(socketId: string) {
    if (!this.socketStates.has(socketId)) {
      this.initializeSocket(socketId);
    }

    const state = this.socketStates.get(socketId)!;
    if (state.ready) {
      state.ready = false;
      state.readyPromise = new Promise((resolve) => {
        state.resolveReady = resolve;
      });
    }
  }

  markReady(socketId: string) {
    if (!this.socketStates.has(socketId)) {
      this.initializeSocket(socketId);
    }

    const state = this.socketStates.get(socketId)!;
    state.ready = true;
    state.resolveReady();
  }

  async waitForReady(socketId: string) {
    if (!this.socketStates.has(socketId)) {
      this.initializeSocket(socketId);
    }

    const state = this.socketStates.get(socketId)!;
    if (state.ready) return;
    await state.readyPromise;
  }

  isReady(socketId: string): boolean {
    return this.socketStates.get(socketId)?.ready ?? false;
  }

  removeSocket(socketId: string) {
    this.socketStates.delete(socketId);
  }

  private initializeSocket(socketId: string) {
    let resolveReady!: () => void;
    const readyPromise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    this.socketStates.set(socketId, {
      ready: false,
      resolveReady,
      readyPromise,
    });
  }
}
