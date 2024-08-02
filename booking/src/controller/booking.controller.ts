import { Router, NextFunction, Request, Response } from 'express';

import {
  ApiResponse,
  Code,
  CoreController,
  QueryBuilder,
  QueryRequest,
  validationMiddleware,
  catchAsync,
  authenticationMiddleware,
  RequestWithUser,
  //natsInstance,
} from '@whooatour/common';

import { ReviewNotFoundError } from '../error/review-not-found.error';
import { UnauthorizedReviewDeletionError } from '../error/unauthorized-review-deletion.error';
//import { ReviewCreatedPublisher } from '../event/publisher/review-created-publisher';
import { Review } from '../model/booking.model';
import { ReviewRepository } from '../repository/review.repository';
import { ReviewValidator } from '../util/review-validator';

export class BookingController implements CoreController {
  public readonly path = '/api/v1/booking';
  public readonly router = Router();
  public readonly repository = new ReviewRepository(Review);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router
      .route(`${this.path}/checkout/:tourId`)
      .get(authenticationMiddleware, this.chcekout);

    this.router.all('*', this.handleRoutes);
  };

  public handleRoutes = async (
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    const error = {
      codeAttr: Code.NOT_FOUND,
      detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
      isOperational: true,
    };

    next(error);
  };

  private chcekout = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      // 1. 현재 예약된 여행.
      const tour = await 
      
      // 2. 체크아웃.
      const session stripe.checkout.sessions.create({
        payment_method_types,
        success_url: `${request.protocol}://${request.get('host')}/`,
        cancel_url: `${request.protocol}://${request.get('host')}/tour/`,
        customer_email,
        client_reference_id: request.params.tourId,
        line_items: [
          {
            name: `${tour.name}`,
            description: tour.summary,
            images: [],
            amount: tour.price,
            currency: 'krw',
            quantity: 1,
          },
        ],
      });

      // 3. 세션.
      response.status(Code.OK.code).json(session);
    }
  );
}
