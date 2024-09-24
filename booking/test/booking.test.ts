import mongoose from 'mongoose';
import request from 'supertest';

import { BookingStatus, UserRole } from '@whooatour/common';

import { userId } from './setup';
import { BookingApplication } from '../src/app';
import { BookingController } from '../src/controller/booking.controller';
import { BookingDocument } from '../src/model/booking.model';

let bookingApplication: BookingApplication;
let booking: Partial<BookingDocument>;
let tour1: any;
let tour2: any;

describe('예약 API 테스트', () => {
  beforeAll(async () => {
    bookingApplication = new BookingApplication([new BookingController()]);

    await mongoose.connection.db!.createCollection('tours');

    tour1 = await mongoose.connection.db!.collection('tours').insertOne({
      coverImage: '서울숲.img',
      difficulty: '하',
      discount: 80000,
      duration: 2,
      groupSize: 2,
      name: '서울숲',
      price: 100000,
      summary: '서울숲에서 휴식을~',
    });

    tour2 = await mongoose.connection.db!.collection('tours').insertOne({
      coverImage: '남산서울타워.img',
      difficulty: '중',
      discount: 90000,
      duration: 4,
      groupSize: 10,
      name: '남산서울타워',
      price: 120000,
      summary: '남산서울타워에서 멋진 전망을~',
    });
  });

  beforeEach(async () => {
    const expiration = new Date();
    expiration.setSeconds(
      expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
    );

    booking = {
      expiration,
      status: BookingStatus.Pending,
      tour: tour1,
      userId,
    };
  });

  describe('취소', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const makeMyBooking = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [cookie])
        .send(booking)
        .expect(201);

      const id = makeMyBooking.body.data.id;

      const cancelMyBooking = await request(bookingApplication.app)
        .delete(`/api/v1/bookings/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(cancelMyBooking.body.data.status).toBe(BookingStatus.Cancelled);
    });

    it('여행이 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .delete(`/api/v1/bookings/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const makeMyBooking = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [cookie])
        .send(booking)
        .expect(201);

      const id = makeMyBooking.body.data.id;

      await request(bookingApplication.app)
        .delete(`/api/v1/bookings/${id}`)
        .expect(401);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const makeMyBooking = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(201);

      const id = makeMyBooking.body.data.id;

      await request(bookingApplication.app)
        .delete(`/api/v1/bookings/${id}`)
        .set('Cookie', [global.signIn()])
        .expect(403);
    });
  });

  describe('조회', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const makeMyBooking = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [cookie])
        .send(booking)
        .expect(201);

      console.log(makeMyBooking.body);

      const id = makeMyBooking.body.data.id;
      console.log(cookie);

      const getMyBooking = await request(bookingApplication.app)
        .get(`/api/v1/bookings/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(getMyBooking.body.data.tour.name).toBe('서울숲');
    });

    it('예약이 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const makeMyBooking = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(201);

      const id = makeMyBooking.body.data.id;

      await request(bookingApplication.app)
        .get(`/api/v1/bookings/${id}`)
        .expect(401);
    });
  });

  describe('목록', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const a = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [cookie])
        .send(booking)
        .expect(201);

      const expiration = new Date();
      expiration.setSeconds(
        expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
      );

      const b = await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour2.insertedId}`)
        .set('Cookie', [cookie])
        .send({
          expiration,
          status: BookingStatus.Pending,
          tour: tour2,
          userId,
        })
        .expect(201);

      const getMyBookings = await request(bookingApplication.app)
        .get(`/api/v1/bookings`)
        .set('Cookie', [cookie])
        .expect(200);

      console.log(a.body);
      console.log(b.body);
      console.log(getMyBookings.body);

      expect(getMyBookings.body.data.length).toBe(2);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [cookie])
        .send(booking)
        .expect(201);

      const expiration = new Date();
      expiration.setSeconds(
        expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
      );

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour2.insertedId}`)
        .set('Cookie', [cookie])
        .send({
          expiration,
          status: BookingStatus.Pending,
          tour: tour1,
          userId: new mongoose.Types.ObjectId(),
        })
        .expect(201);

      await request(bookingApplication.app).get(`/api/v1/bookings`).expect(401);
    });
  });

  describe('생성', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(201);
    });

    it('여행이 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(404);
    });

    it('여행이 이미 예악되어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(201);

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(booking)
        .expect(409);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(bookingApplication.app)
        .post(`/api/v1/bookings/tours/${tour1.insertedId}`)
        .send(booking)
        .expect(401);
    });
  });
});
