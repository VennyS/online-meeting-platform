import { Injectable } from '@nestjs/common';

@Injectable()
export class InitService {
  private ready = false;
  private resolveReady!: () => void;
  private readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  markNotReady() {
    if (this.ready) {
      this.ready = false;
      this.readyPromise = new Promise((resolve) => {
        this.resolveReady = resolve;
      });
    }
  }

  markReady() {
    this.ready = true;
    this.resolveReady();
  }

  async waitForReady() {
    if (this.ready) return;
    await this.readyPromise;
  }
}
