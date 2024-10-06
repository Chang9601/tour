import { Router, NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';

import {
  ApiResponse,
  Code,
  CoreController,
  catchAsync,
  authenticationMiddleware,
  RequestWithUser,
  CoreError,
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
import { BookingRepository } from '../repository/booking.repository';

export class BookingController implements CoreController {
  public readonly path = '/api/v1/bookings';
  public readonly adminPath = '/api/v1/admin/bookings';
  public readonly router = Router();
  public readonly repository = new BookingRepository(Booking);
  public readonly redis = new Redis(
    process.env.REDIS_PORT,
    process.env.REDIS_HOST,
  );

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    // TODO: 경로를 어떻게?
    this.router
      .route(`${this.path}/tours/:tourId`)
      .post(authenticationMiddleware(this.redis), this.makeMyBooking);

    this.router
      .route(`${this.path}/:id`)
      .delete(authenticationMiddleware(this.redis), this.cancelMyBooking)
      .get(authenticationMiddleware(this.redis), this.getMyBooking);

    this.router
      .route(`${this.path}`)
      .get(authenticationMiddleware, this.getMyBookings);

    /* 관리자 API */
    this.router
      .route(`${this.adminPath}/:id`)
      .delete(
        authenticationMiddleware(this.redis),
        authorizationMiddleware(UserRole.Admin),
        this.cancelBooking,
      )
      .get(
        authenticationMiddleware(this.redis),
        authorizationMiddleware(UserRole.Admin),
        this.getBooking,
      );

    this.router
      .route(`${this.adminPath}`)
      .get(
        authenticationMiddleware(this.redis),
        authorizationMiddleware(UserRole.Admin),
        this.getBookings,
      );

    this.router.all('*', this.handleRoutes);
  };

  public handleRoutes = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const error: Partial<CoreError> = {
      codeAttribute: Code.NOT_FOUND,
      detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
      isOperational: true,
    };

    next(error);
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

      const booking = await (
        await this.repository.find({ _id: request.params.id })
      ).populate('tour');

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
      const booking = await (
        await this.repository.find({
          _id: request.params.id,
          userId: request.user!.id,
        })
      ).populate('tour');

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
        this.repository.findAll({ userId: request.user!.id }).populate('tour'),
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
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 예약을 취소할 수 있는 권한이 없습니다.',
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

      const isBooked = await tour.isBooked();

      if (isBooked) {
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
      const booking = await (
        await this.repository.find({ _id: request.params.id })
      ).populate('tour');

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
      const booking = await (
        await this.repository.find({
          _id: request.params.id,
        })
      ).populate('tour');

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
        this.repository.findAll().populate('tour'),
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
