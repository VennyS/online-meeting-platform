import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WebhookReceiver, WebhookEvent } from 'livekit-server-sdk';

const logger = new Logger('LivekitWebhook');

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

export const LivekitWebhook = createParamDecorator(
  async (_, ctx: ExecutionContext): Promise<WebhookEvent> => {
    const req = ctx.switchToHttp().getRequest();

    const rawBody = req.rawBody?.toString('utf-8') || req.body;

    const authHeader = req.headers['authorization'] || '';

    try {
      const event = await receiver.receive(rawBody, authHeader);
      return event;
    } catch (err) {
      logger.error('Webhook validation failed', err as any);
      throw new BadRequestException('Invalid LiveKit webhook signature');
    }
  },
);
