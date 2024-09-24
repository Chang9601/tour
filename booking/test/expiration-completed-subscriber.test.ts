import mongoose from 'mongoose';
import { Message } from 'node-nats-streaming';

import {
  BookingStatus,
  ExpirationCompletedEvent,
  natsInstance,
} from '@whooatour/common';

import { ExpirationCompletedSubscriber } from '../src/event/subscriber/expiration-completed.subscriber';
import { Tour, TourDocument } from '../src/model/tour.model';
import { Booking, BookingDocument } from '../src/model/booking.model';

let tour: TourDocument;
let booking: BookingDocument;

const setUp = async () => {
  const expirationCompletedSubscriber = new ExpirationCompletedSubscriber(
    natsInstance.client,
  );

  const data: ExpirationCompletedEvent['data'] = {
    bookingId: booking.id,
  };

  //@ts-ignore
  const message: Message = {
    ack: jest.fn(),
  };

  return { expirationCompletedSubscriber, tour, booking, data, message };
};

describe('만료 완료 이벤트 구독자 테스트', () => {
  beforeAll(async () => {
    tour = await Tour.create({
      _id: new mongoose.Types.ObjectId(),
      difficulty: '하',
      duration: 3,
      groupSize: 5,
      name: '서울숲',
      price: 100000,
    });

    // booking = await Booking.create({
    //   expiration: new Date(),
    //   status: BookingStatus.Pending,
    //   tour,
    //   userId: new mongoose.Types.ObjectId(),
    // });
  });

  beforeEach(async () => {
    booking = await Booking.create({
      expiration: new Date(),
      status: BookingStatus.Pending,
      tour,
      userId: new mongoose.Types.ObjectId(),
    });
  });

  describe('취소 이벤트', () => {
    describe('취소', () => {
      it('예약 취소에 성공한다.', async () => {
        const { expirationCompletedSubscriber, booking, data, message } =
          await setUp();

        await expirationCompletedSubscriber.onMessage(data, message);

        const updatedBooking = await Booking.findOne({ _id: booking.id });

        expect(updatedBooking!.status).toBe(BookingStatus.Cancelled);
      });
    });

    describe('방출', () => {
      it('BookingCancelled 이벤트를 방출하는데 성공한다.', async () => {
        const { expirationCompletedSubscriber, booking, data, message } =
          await setUp();

        await expirationCompletedSubscriber.onMessage(data, message);

        /*
         * 1번 인자는 채널의 이름.
         * 2번 인자는 전달하는 데이터.
         */
        const eventData = JSON.parse(
          (natsInstance.client.publish as jest.Mock).mock.calls[0][1],
        );

        expect(eventData.id).toBe(booking._id);
        expect(natsInstance.client.publish).toHaveBeenCalled();
      });
    });

    describe('확인', () => {
      it('메시지를 확인하는데 성공한다.', async () => {
        const { expirationCompletedSubscriber, data, message } = await setUp();

        await expirationCompletedSubscriber.onMessage(data, message);

        expect(message.ack).toHaveBeenCalled();
      });
    });
  });
});
