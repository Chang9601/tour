import { Message } from 'node-nats-streaming';

import { CoreSubscriber, Subject, UserBannedEvent } from '@whooatour/common';

import { queueGroup } from '../../event/queue-group';
import { redis } from '../../redis/redis';

// TODO: OCC 적용 가능?
export class UserBannedSubscriber extends CoreSubscriber<UserBannedEvent> {
  readonly subject = Subject.UserBanned;
  queueGroup = queueGroup;

  async onMessage(
    data: UserBannedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      await redis.hset(`users:${data.id}`, { banned: true });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
