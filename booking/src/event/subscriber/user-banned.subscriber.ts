import { Message } from 'node-nats-streaming';

import {
  CoreSubscriber,
  generateUsersKey,
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
      // const { id, banned, userRole } = data;

      // const cachedUser = await redis.hgetall(`users:${id}`);

      // if (findCachedUser(cachedUser)) {
      //   await redis.hset(`users:${id}`, { banned: true });
      // } else {
      //   await cacheUser(
      //     {
      //       id,
      //       banned,
      //       userRole,
      //     },
      //     process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
      //   );
      // }

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
