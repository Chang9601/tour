import mongoose from 'mongoose';
import { Message } from 'node-nats-streaming';

import {
  BookingCancelledEvent,
  BookingStatus,
  natsInstance,
} from '@whooatour/common';

import { BookingCancelledSubscriber } from '../src/event/subscriber/booking-cancelled.subscriber';
import { Booking } from '../src/model/booking.model';

const setUp = async () => {
  const boookingCancelledSubscriber = new BookingCancelledSubscriber(
    natsInstance.client,
  );

  const booking = await Booking.create({
    _id: new mongoose.Types.ObjectId(),
    status: BookingStatus.Pending,
    tour: {
      _id: new mongoose.Types.ObjectId(),
      difficulty: '하',
      discount: 80000,
      duration: 2,
      groupSize: 2,
      name: '서울숲',
      price: 100000,
      summary: '서울숲에서 휴식을~',
    },
    userId: new mongoose.Types.ObjectId(),
    sequence: 0,
  });

  const data: BookingCancelledEvent['data'] = {
    id: booking._id,
    tour: {
      id: new mongoose.Types.ObjectId(),
    },
    sequence: 1,
  };

  //@ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  return { boookingCancelledSubscriber, data, message };
};

describe('취소 이벤트', () => {
  it('예약 생성에 성공한다.', async () => {
    const { boookingCancelledSubscriber, data, message } = await setUp();

    await boookingCancelledSubscriber.onMessage(data, message);

    const booking = await Booking.findOne({ _id: data.id });

    expect(booking!.status).toBe(BookingStatus.Cancelled);
  });

  it('메시지를 확인하는데 성공한다.', async () => {
    const { boookingCancelledSubscriber, data, message } = await setUp();

    await boookingCancelledSubscriber.onMessage(data, message);

    expect(message.ack).toHaveBeenCalled();
  });
});
