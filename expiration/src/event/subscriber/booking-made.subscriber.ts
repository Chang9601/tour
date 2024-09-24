import { Message } from 'node-nats-streaming';

import { BookingMadeEvent, CoreSubscriber, Subject } from '@whooatour/common';

import { expirationQueue } from '../../queue/expiration-queue';
import { queueGroup } from '../queue-group';

export class BookingMadeSubscriber extends CoreSubscriber<BookingMadeEvent> {
  readonly subject = Subject.BookingMade;
  queueGroup = queueGroup;

  async onMessage(
    data: BookingMadeEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const delay = new Date(data.expiration).getTime() - new Date().getTime();

      console.log(`대기 시간(ms): ${delay}`);

      await expirationQueue.add(
        {
          bookingId: data.id,
        },
        { delay },
      );

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
