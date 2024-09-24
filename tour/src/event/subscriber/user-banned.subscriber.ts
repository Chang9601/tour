import { Message } from 'node-nats-streaming';

import {
  CoreSubscriber,
  RedisType,
  RedisUtil,
  Subject,
  UserBannedEvent,
} from '@whooatour/common';

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
