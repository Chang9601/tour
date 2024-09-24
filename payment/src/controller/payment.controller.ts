import { Router, NextFunction, Request, Response } from 'express';

import {
  ApiResponse,
  Code,
  CoreController,
  catchAsync,
  authenticationMiddleware,
  RequestWithUser,
  BookingStatus,
  UnauthorizedUserError,
  natsInstance,
  authorizationMiddleware,
  UserRole,
  QueryBuilder,
  QueryRequest,
} from '@whooatour/common';

import { BookingCancelledError } from '../error/booking-cancelled.error';
import { BookingNotFoundError } from '../error/booking-not-found.error';
import { PaymentMadePublisher } from '../event/publisher/payment-made.publisher';
import { Booking } from '../model/booking.model';
import { Payment } from '../model/payment.model';
import { redis } from '../redis/redis';
import { PaymentRepository } from '../repository/payment.repository';
import { stripe } from '../stripe/stripe';

export class PaymentController implements CoreController {
  public readonly path = '/api/v1/payments';
  public readonly adminPath = '/api/v1/admin/payments';
  public readonly router = Router();
  public readonly repository = new PaymentRepository(Payment);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.use(authenticationMiddleware(redis));

    this.router.get(`${this.path}/:id`, this.getMyPayment);

    this.router
      .route(`${this.path}`)
      .get(this.getMyPayments)
      .post(this.makeMyPayment);

    /* 관리자 API */
    this.router.use(authorizationMiddleware(UserRole.Admin));

    this.router.get(`${this.adminPath}/:id`, this.getPayment);
    this.router.get(`${this.adminPath}`, this.getPayments);
  };

  private getMyPayment = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const payments = await this.repository.findOne({
        _id: request.params.id,
        userId: request.user!.id,
      });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        payments,
        '결제를 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMyPayments = catchAsync(
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

      const payments = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        payments,
        '결제 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
  private makeMyPayment = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 결제할 수 있는 권한이 없습니다.',
          ),
        );
      }

      const { token, bookingId } = request.body;

      const booking = await Booking.findOne({ _id: bookingId });

      if (!booking) {
        return next(
          new BookingNotFoundError(
            Code.NOT_FOUND,
            '아이디에 해당하는 예약이 존재하지 않습니다.',
          ),
        );
      }

      // TODO: !== 사용 시 오류 발생.
      if (booking.userId != request.user!.id) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '결제를 할 수 있는 권한이 없습니다.',
          ),
        );
      }

      if (booking.status === BookingStatus.Cancelled) {
        return next(
          new BookingCancelledError(
            Code.BAD_REQUEST,
            '취소한 예약을 결제할 수 없습니다.',
          ),
        );
      }

      const charge = await stripe.charges.create({
        currency: 'krw',
        amount: booking.price,
        source: token,
      });

      request.body.bookingId = bookingId;
      request.body.chargeId = charge.id;
      request.body.userId = request.user!.id;

      const payment = await this.repository.create(request.body);

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        payment,
        '결제를 완료했습니다.',
      );

      await new PaymentMadePublisher(natsInstance.client).publish({
        id: payment.id,
        bookingId: payment.bookingId,
        chargeId: payment.chargeId,
        userId: payment.userId,
        sequence: payment.sequence,
      });

      response.status(Code.OK.code).json(success);
    },
  );

  /* 관리자 API */
  private getPayment = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const payment = await this.repository.findOne({ _id: request.params.id });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        payment,
        '결제를 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getPayments = catchAsync(
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

      const payments = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        payments,
        '결제 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
}
