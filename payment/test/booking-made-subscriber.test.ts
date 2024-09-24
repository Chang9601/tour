import mongoose from 'mongoose';
import { Message } from 'node-nats-streaming';

import {
  BookingMadeEvent,
  BookingStatus,
  natsInstance,
} from '@whooatour/common';

import { BookingMadeSubscriber } from '../src/event/subscriber/booking-made.subscriber';
import { Booking } from '../src/model/booking.model';

const setUp = async () => {
  const boookingMadeSubscriber = new BookingMadeSubscriber(natsInstance.client);

  const data: BookingMadeEvent['data'] = {
    id: new mongoose.Types.ObjectId(),
    expiration: new Date().toISOString(),
    status: BookingStatus.Pending,
    tour: {
      id: new mongoose.Types.ObjectId(),
      price: 100000,
    },
    userId: new mongoose.Types.ObjectId(),
    sequence: 0,
  };

  //@ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  return { boookingMadeSubscriber, data, message };
};

describe('생성 이벤트', () => {
  it('예약 생성에 성공한다.', async () => {
    const { boookingMadeSubscriber, data, message } = await setUp();

    await boookingMadeSubscriber.onMessage(data, message);

    const booking = await Booking.findOne({ _id: data.id });

    expect(booking!.status).toBe(data.status);
  });

  it('메시지를 확인하는데 성공한다.', async () => {
    const { boookingMadeSubscriber, data, message } = await setUp();

    await boookingMadeSubscriber.onMessage(data, message);

    expect(message.ack).toHaveBeenCalled();
  });
});
