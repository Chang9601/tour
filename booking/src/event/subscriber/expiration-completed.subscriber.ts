import { Message } from 'node-nats-streaming';

import {
  BookingStatus,
  Code,
  CoreSubscriber,
  ExpirationCompletedEvent,
  natsInstance,
  Subject,
} from '@whooatour/common';

import { BookingNotFoundError } from '../../error/booking-not-found.error';
import { BookingCancelledPublisher } from '../../event/publisher/booking-cancelled.publisher';
import { Booking } from '../../model/booking.model';
import { queueGroup } from '../queue-group';

export class ExpirationCompletedSubscriber extends CoreSubscriber<ExpirationCompletedEvent> {
  readonly subject = Subject.ExpirationCompleted;
  queueGroup = queueGroup;

  async onMessage(
    data: ExpirationCompletedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const booking = await Booking.findOne({ _id: data.bookingId }).populate(
        'tour',
      );

      if (!booking) {
        throw new BookingNotFoundError(
          Code.NOT_FOUND,
          '아이디에 해당하는 예약이 존재하지 않습니다.',
        );
      }

      /* 결제된 예약은 취소하지 않는다. */
      if (booking.status === BookingStatus.Completed) {
        return message.ack();
      }

      booking.set({
        status: BookingStatus.Cancelled,
      });

      await booking.save();

      await new BookingCancelledPublisher(natsInstance.client).publish({
        id: booking.id,
        tour: {
          id: booking.tour.id,
        },
        sequence: booking.sequence,
      });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
