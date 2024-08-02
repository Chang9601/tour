import { Router, NextFunction, Request, Response, query } from 'express';

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
  public readonly router = Router();
  public readonly repository = new BookingRepository(Booking);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    // this.router
    //   .route(`${this.path}/checkout/:tourId`)
    //   .get(authenticationMiddleware, this.chcekout);

    this.router
      .route(`${this.path}/tours/:tourId`)
      .post(authenticationMiddleware, this.makeMyBooking);

    this.router
      .route(`${this.path}/:id`)
      .delete(authenticationMiddleware, this.cancelMyBooking)
      .get(authenticationMiddleware, this.getMyBooking);

    this.router
      .route(`${this.path}`)
      .get(authenticationMiddleware, this.getMyBookings);

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
          userId: request.user?.id,
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
        this.repository.findAll({ userId: request.user?.id }).populate('tour'),
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
      if (!request.body.userId) request.body.userId = request.user?.id;

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
      expiration.setSeconds(
        expiration.getSeconds() + process.env.EXPIRATION_WINDOW,
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

  // private getMyBooking = catchAsync(
  //   async (
  //     request: RequestWithUser,
  //     response: Response,
  //     next: NextFunction,
  //   ): Promise<void> => {
  //     if (!request.body.tourId) request.body.tourId = request.params.tourId;
  //     if (!request.body.userId) request.body.userId = request.user?.id;

  //     const booking = await this.repository.create(request.body);

  //     const success = ApiResponse.handleSuccess(
  //       Code.CREATED.code,
  //       Code.CREATED.message,
  //       booking,
  //       '예약을 생성했습니다.',
  //     );
  //   },
  // );

  // private chcekout = catchAsync(
  //   async (
  //     request: RequestWithUser,
  //     response: Response,
  //     next: NextFunction
  //   ): Promise<void> => {
  //     // 1. 현재 예약된 여행.
  //     const tour = await

  //     // 2. 체크아웃.
  //     const session stripe.checkout.sessions.create({
  //       payment_method_types,
  //       success_url: `${request.protocol}://${request.get('host')}/?tour=${request.params.tourId}&user=${request.user.id}&price=${tour.price}`,
  //       cancel_url: `${request.protocol}://${request.get('host')}/tour/${tour.slug}`,
  //       customer_email,
  //       client_reference_id: request.params.tourId,
  //       line_items: [
  //         {
  //           name: `${tour.name}`,
  //           description: tour.summary,
  //           images: [],
  //           amount: tour.price,
  //           currency: 'krw',
  //           quantity: 1,
  //         },
  //       ],
  //     });

  //     // 3. 세션.
  //     response.status(Code.OK.code).json(session);
  //   }
  // );

  // private createCheckout = catchAsync(
  //   async (
  //     request: RequestWithUser,
  //     response: Response,
  //     next: NextFunction
  //   ): Promise<void> => {
  //   // 임시방편. 아무나 결제하지 않고 예약을 할 수 있다.
  //   const {tour, user, price} = request.query;

  //     if (!tour && !user && price) {
  //       return next();
  //     }

  //     this.repository.create({tour, user, price});

  //     response.redirect(request.originalUrl.split('?')[0]);

  //   }
  // )
}
