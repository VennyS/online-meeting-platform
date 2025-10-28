import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/common/modules/redis/redis.service';
import { Presentation } from '../interfaces/presentation.interface';

export class PresentationNotFoundError extends Error {}

@Injectable()
export class PresentationService {
  private readonly logger = new Logger(PresentationService.name);

  constructor(private readonly redis: RedisService) {}

  async get(roomShortId: string) {
    return await this.redis.getPresentations(roomShortId);
  }

  async changePresentation<T extends keyof Presentation>(
    roomShortId: string,
    presentationId: string,
    userId: string,
    field: T,
    value: Presentation[T],
  ): Promise<void> {
    const presentation = (await this.redis.getPresentation(
      roomShortId,
      presentationId,
    )) as Presentation;
    if (!presentation) {
      this.logger.warn(
        `Presentation ${presentationId} not found in room ${roomShortId}`,
      );
      throw Error('Presentation error');
    }

    if (presentation.authorId !== userId) {
      this.logger.warn(
        `Non author ${userId} tried to change presentation ${presentationId} field ${field} to ${value}`,
      );
      throw Error('Presentation error');
    }

    if (field === 'scroll' && typeof value === 'object') {
      const currentField = presentation[field] || {};
      presentation[field] = {
        ...currentField,
        ...value,
      } as Presentation[T];
    } else {
      presentation[field] = value;
    }

    await this.redis.setPresentation(roomShortId, presentation);
  }

  async finishPresentation(roomShortId: string, presentationId: string) {
    await this.redis.deletePresentation(roomShortId, presentationId);
  }

  async findAndFinishPresentation(roomShortId: string, userId: number) {
    const presentations = await this.redis.getPresentations(roomShortId);
    const presentationId = presentations.find(
      (p) => p.authorId === String(userId),
    )?.presentationId;

    if (!presentationId)
      throw new PresentationNotFoundError('No presentation found');

    await this.finishPresentation(roomShortId, presentationId);

    return presentationId;
  }
}
