import { Message } from 'node-nats-streaming';

import {
  CoreSubscriber,
  RedisType,
  RedisUtil,
  Subject,
  UserUnbannedEvent,
} from '@whooatour/common';

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
      const { id, banned, userRole } = data;

      const isCached = await RedisUtil.isCached(id, RedisType.User, redis);

      if (isCached) {
        await RedisUtil.setHash(id, { banned }, RedisType.User, redis);
      } else {
        await RedisUtil.cacheUser(
          {
            id,
            banned,
            userRole,
          },
          1 * 60 * 60,
          redis,
        );
      }
      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
