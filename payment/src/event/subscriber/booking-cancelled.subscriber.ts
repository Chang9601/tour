import { Message } from 'node-nats-streaming';

import {
  BookingCancelledEvent,
  BookingStatus,
  Code,
  CoreSubscriber,
  Nullable,
  Subject,
} from '@whooatour/common';

import { queueGroup } from '../../event/queue-group';
import { BookingNotFoundError } from '../../error/booking-not-found.error';
import { Booking, BookingDocument } from '../../model/booking.model';

export class BookingCancelledSubscriber extends CoreSubscriber<BookingCancelledEvent> {
  readonly subject = Subject.BookingCancelled;
  queueGroup = queueGroup;

  async onMessage(
    data: BookingCancelledEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const { id, sequence } = data;

      const booking: Nullable<BookingDocument> = await Booking.findOne({
        _id: id,
        sequence: sequence - 1,
      });

      if (!booking) {
        throw new BookingNotFoundError(
          Code.NOT_FOUND,
          '아이디에 해당하는 예약이 존재하지 않습니다.',
        );
      }

      booking.set({ status: BookingStatus.Cancelled });

      await booking.save({ validateModifiedOnly: true });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
