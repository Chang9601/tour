import { Message } from 'node-nats-streaming';

import { CoreSubscriber, Subject, UserUnbannedEvent } from '@whooatour/common';

import { queueGroup } from '../../event/queue-group';
import { redis } from '../../redis/redis';

export class UserUnbannedSubscriber extends CoreSubscriber<UserUnbannedEvent> {
  readonly subject = Subject.UserUnbanned;
  queueGroup = queueGroup;

  async onMessage(
    data: UserUnbannedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      await redis.hset(`users:${data.id}`, { banned: false });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
