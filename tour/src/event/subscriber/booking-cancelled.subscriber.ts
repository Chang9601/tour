import { Message } from 'node-nats-streaming';

import {
  BookingCancelledEvent,
  Code,
  CoreSubscriber,
  Nullable,
  Subject,
} from '@whooatour/common';

import { TourNotFoundError } from '../../error/tour-not-found.error';
import { queueGroup } from '../../event/queue-group';
import { Tour, TourDocument } from '../../model/tour.model';

export class BookingCancelledSubscriber extends CoreSubscriber<BookingCancelledEvent> {
  readonly subject = Subject.BookingCancelled;
  queueGroup = queueGroup;

  async onMessage(
    data: BookingCancelledEvent['data'],
    message: Message,
  ): Promise<void> {
    const tour: Nullable<TourDocument> = await Tour.findOne({
      _id: data.tour.id,
    });

    if (!tour) {
      throw new TourNotFoundError(
        Code.NOT_FOUND,
        '아이디에 해당하는 여행이 존재하지 않습니다.',
      );
    }

    tour.bookingId = undefined;

    await tour.save({ validateModifiedOnly: true });

    message.ack();
  }
}
