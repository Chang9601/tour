import { Message } from 'node-nats-streaming';

import {
  BookingStatus,
  Code,
  CoreSubscriber,
  PaymentMadeEvent,
  Subject,
} from '@whooatour/common';

import { BookingNotFoundError } from '../../error/booking-not-found.error';
import { Booking } from '../../model/booking.model';
import { queueGroup } from '../queue-group';

export class PaymentMadeSubscriber extends CoreSubscriber<PaymentMadeEvent> {
  readonly subject = Subject.PaymentMade;
  queueGroup = queueGroup;

  async onMessage(
    data: PaymentMadeEvent['data'],
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

      booking.set({
        status: BookingStatus.Completed,
      });

      await booking.save();

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
