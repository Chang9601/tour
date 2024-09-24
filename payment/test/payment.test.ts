import mongoose from 'mongoose';
import request from 'supertest';

import { BookingStatus, UserRole } from '@whooatour/common';

import { PaymentApplication } from '../src/app';
import { PaymentController } from '../src/controller/payment.controller';
import { Booking, BookingDocument } from '../src/model/booking.model';

jest.mock('stripe', () => ({
  charges: {
    create: () => 111,
  },
  ...jest.requireActual('stripe'),
}));

let userId: mongoose.Types.ObjectId;
let paymentApplication: PaymentApplication;
let booking: BookingDocument;

describe('결제 API 테스트', () => {
  beforeEach(async () => {
    paymentApplication = new PaymentApplication([new PaymentController()]);

    userId = new mongoose.Types.ObjectId();

    booking = await Booking.create({
      price: 100000,
      status: BookingStatus.Pending,
      userId,
    });
  });

  // beforeEach(async () => {
  //   const expiration = new Date();
  //   expiration.setSeconds(
  //     expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
  //   );

  //   booking = {
  //     expiration,
  //     status: BookingStatus.Pending,
  //     tour: tour1,
  //     userId,
  //   };
  // });

  describe('완료', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(paymentApplication.app)
        .post(`/api/v1/payments`)
        .set('Cookie', [global.signIn(userId)])
        .send({
          bookingId: booking._id,
          token: 'tok_visa',
        })
        .expect(201);
    });

    it('예약이 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(paymentApplication.app)
        .post(`/api/v1/payments`)
        .set('Cookie', [global.signIn(userId)])
        .send({
          bookingId: new mongoose.Types.ObjectId(),
          token: 'tok_visa',
        })
        .expect(404);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(paymentApplication.app)
        .post(`/api/v1/payments`)
        .send({
          bookingId: booking._id,
          token: 'tok_visa',
        })
        .expect(401);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(paymentApplication.app)
        .post(`/api/v1/payments`)
        .set('Cookie', [global.signIn()])
        .send({
          bookingId: booking._id,
          token: 'tok_visa',
        })
        .expect(403);
    });
  });

  // describe('조회', () => {
  //   it('성공한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     const cookie = global.signIn();

  //     const makeMyBooking = await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [cookie])
  //       .send(booking)
  //       .expect(201);

  //     console.log(makeMyBooking.body);

  //     const id = makeMyBooking.body.data.id;
  //     console.log(cookie);

  //     const getMyBooking = await request(bookingApplication.app)
  //       .get(`/api/v1/bookings/${id}`)
  //       .set('Cookie', [cookie])
  //       .expect(200);

  //     expect(getMyBooking.body.data.tour.name).toBe('서울숲');
  //   });

  //   it('예약이 존재하지 않으므로 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/${new mongoose.Types.ObjectId()}`)
  //       .set('Cookie', [global.signIn()])
  //       .expect(404);
  //   });

  //   it('인증되지 않아 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     const makeMyBooking = await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [global.signIn()])
  //       .send(booking)
  //       .expect(201);

  //     const id = makeMyBooking.body.data.id;

  //     await request(bookingApplication.app)
  //       .get(`/api/v1/bookings/${id}`)
  //       .expect(401);
  //   });
  // });

  // describe('목록', () => {
  //   it('성공한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     const cookie = global.signIn();

  //     const a = await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [cookie])
  //       .send(booking)
  //       .expect(201);

  //     const expiration = new Date();
  //     expiration.setSeconds(
  //       expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
  //     );

  //     const b = await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour2.insertedId}`)
  //       .set('Cookie', [cookie])
  //       .send({
  //         expiration,
  //         status: BookingStatus.Pending,
  //         tour: tour2,
  //         userId,
  //       })
  //       .expect(201);

  //     const getMyBookings = await request(bookingApplication.app)
  //       .get(`/api/v1/bookings`)
  //       .set('Cookie', [cookie])
  //       .expect(200);

  //     console.log(a.body);
  //     console.log(b.body);
  //     console.log(getMyBookings.body);

  //     expect(getMyBookings.body.data.length).toBe(2);
  //   });

  //   it('인증되지 않아 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     const cookie = global.signIn();

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [cookie])
  //       .send(booking)
  //       .expect(201);

  //     const expiration = new Date();
  //     expiration.setSeconds(
  //       expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
  //     );

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour2.insertedId}`)
  //       .set('Cookie', [cookie])
  //       .send({
  //         expiration,
  //         status: BookingStatus.Pending,
  //         tour: tour1,
  //         userId: new mongoose.Types.ObjectId(),
  //       })
  //       .expect(201);

  //     await request(bookingApplication.app).get(`/api/v1/bookings`).expect(401);
  //   });
  // });

  // describe('생성', () => {
  //   it('성공한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [global.signIn()])
  //       .send(booking)
  //       .expect(201);
  //   });

  //   it('여행이 존재하지 않으므로 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${new mongoose.Types.ObjectId()}`)
  //       .set('Cookie', [global.signIn()])
  //       .send(booking)
  //       .expect(404);
  //   });

  //   it('여행이 이미 예악되어 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [global.signIn()])
  //       .send(booking)
  //       .expect(201);

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .set('Cookie', [global.signIn()])
  //       .send(booking)
  //       .expect(409);
  //   });

  //   it('인증되지 않아 실패한다.', async () => {
  //     process.env.TEST_USER_ROLE = UserRole.User;

  //     await request(bookingApplication.app)
  //       .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
  //       .send(booking)
  //       .expect(401);
  //   });
  // });
});
