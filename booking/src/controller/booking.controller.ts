import { Router, NextFunction, Request, Response } from 'express';

import {
  ApiResponse,
  Code,
  CoreController,
  catchAsync,
  authenticationMiddleware,
  RequestWithUser,
  BookingStatus,
  QueryRequest,
  QueryBuilder,
  UnauthorizedUserError,
  natsInstance,
  authorizationMiddleware,
  UserRole,
} from '@whooatour/common';

import { DuplicatedBookingError } from '../error/duplicate-booking.error';
import { TourNotFoundError } from '../error/tour-not-found.error';
import { BookingCancelledPublisher } from '../event/publisher/booking-cancelled.publisher';
import { BookingMadePublisher } from '../event/publisher/booking-made.publisher';
import { Booking } from '../model/booking.model';
import { Tour } from '../model/tour.model';
import { redis } from '../redis/redis';
import { BookingRepository } from '../repository/booking.repository';

export class BookingController implements CoreController {
  public readonly path = '/api/v1/bookings';
  public readonly adminPath = '/api/v1/admin/bookings';
  public readonly router = Router();
  public readonly repository = new BookingRepository(Booking);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.use(authenticationMiddleware(redis));

    this.router.post(`/api/v1/tours/:tourId/bookings`, this.makeMyBooking);

    this.router
      .route(`${this.path}/:id`)
      .delete(this.cancelMyBooking)
      .get(this.getMyBooking);

    this.router.get(`${this.path}`, this.getMyBookings);

    /* 관리자 API */
    this.router.use(authorizationMiddleware(UserRole.Admin));

    this.router
      .route(`${this.adminPath}/:id`)
      .delete(this.cancelBooking)
      .get(this.getBooking);

    this.router.route(`${this.adminPath}`).get(this.getBookings);
  };

  private cancelMyBooking = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 예약을 취소할 수 있는 권한이 없습니다.',
          ),
        );
      }

      const booking = await this.repository.findOne({
        _id: request.params.id,
      });

      // TODO: !== 사용 시 오류 발생.
      if (booking.userId != request.user!.id) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '예약을 취소할 수 있는 권한이 없습니다.',
          ),
        );
      }

      booking.status = BookingStatus.Cancelled;

      await booking.save();

      await new BookingCancelledPublisher(natsInstance.client).publish({
        id: booking.id,
        tour: {
          id: booking.tour.id,
        },
        sequence: booking.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        booking,
        '예약을 취소했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMyBooking = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const booking = await this.repository.findOne({
        _id: request.params.id,
        userId: request.user!.id,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        booking,
        '예약을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMyBookings = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const queryBuilder = new QueryBuilder(
        this.repository.find({ userId: request.user!.id }),
        request.query,
      )
        .filter()
        .sort()
        .project()
        .paginate();

      const bookings = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        bookings,
        '예약 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private makeMyBooking = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      console.log(request.user);
      console.log(typeof request.user!.banned);

      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 예약을 할 수 있는 권한이 없습니다.',
          ),
        );
      }

      if (!request.body.userId) request.body.userId = request.user!.id;

      const tour = await Tour.findOne({ _id: request.params.tourId });

      if (!tour) {
        return next(
          new TourNotFoundError(
            Code.NOT_FOUND,
            '아이디에 해당하는 여행이 존재하지 않습니다.',
          ),
        );
      }

      if (await tour.isBooked()) {
        return next(
          new DuplicatedBookingError(
            Code.CONFLICT,
            '해당 여행은 이미 예약되었습니다.',
          ),
        );
      }

      const expiration = new Date();

      /* 환경변수가 원하는 숫자대로 해석되지 않아서 강제로 숫자로 변경한다. */
      expiration.setSeconds(
        expiration.getSeconds() + Number(process.env.EXPIRATION_WINDOW),
      );

      request.body.expiration = expiration;
      request.body.status = BookingStatus.Pending;
      request.body.tour = tour;

      const booking = await this.repository.create(request.body);

      await new BookingMadePublisher(natsInstance.client).publish({
        id: booking.id,
        expiration: booking.expiration.toISOString(),
        status: booking.status,
        tour: {
          id: booking.tour.id,
          price: booking.tour.price,
        },
        userId: booking.userId,
        sequence: booking.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        booking,
        '예약을 생성했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  /* 관리자 API */
  private cancelBooking = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const booking = await this.repository.findOne({
        _id: request.params.id,
      });

      booking.status = BookingStatus.Cancelled;

      await booking.save();

      await new BookingCancelledPublisher(natsInstance.client).publish({
        id: booking.id,
        tour: {
          id: booking.tour.id,
        },
        sequence: booking.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        booking,
        '예약을 취소했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getBooking = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const booking = await this.repository.findOne({
        _id: request.params.id,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        booking,
        '예약을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getBookings = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const queryBuilder = new QueryBuilder(
        this.repository.find(),
        request.query,
      )
        .filter()
        .sort()
        .project()
        .paginate();

      const bookings = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        bookings,
        '예약 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
}
