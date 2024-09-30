import { Message } from 'node-nats-streaming';

import {
  BookingMadeEvent,
  Code,
  CoreSubscriber,
  Nullable,
  Subject,
} from '@whooatour/common';

import { queueGroup } from '../../event/queue-group';
import { Booking } from '../../model/booking.model';

// OK
export class BookingMadeSubscriber extends CoreSubscriber<BookingMadeEvent> {
  readonly subject = Subject.BookingMade;
  queueGroup = queueGroup;

  async onMessage(
    data: BookingMadeEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const { id, status, tour, userId, sequence } = data;

      await Booking.create({
        _id: id,
        price: tour.price,
        status,
        userId,
        sequence,
      });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
