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
import { Review } from '../model/review.model';
import { ReviewRepository } from '../repository/review.repository';
import { ReviewValidator } from '../util/review-validator';

export class ReviewController implements CoreController {
  public readonly path = '/api/v1/reviews';
  public readonly router = Router();
  public readonly repository = new ReviewRepository(Review);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    // TODO: 경로를 수정하여 여행 컨트롤러로 전달되는거 방지.
    this.router
      .route(`${this.path}/tours/:tourId`)
      .post(
        authenticationMiddleware,
        ...validationMiddleware(ReviewValidator.create()),
        this.createReview
      );

    this.router.route(this.path).get(this.getReviews);

    this.router
      .route(`${this.path}/:id`)
      .delete(authenticationMiddleware, this.deleteReview)
      .get(this.getReview)
      .patch(
        authenticationMiddleware,
        ...validationMiddleware(ReviewValidator.update()),
        this.updateReview
      );

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

  private aliasTopTours = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      request.query.limit = '5';
      request.query.sort = '-ratingAverage,price';
      request.query.fields = 'name,price,ratingAverage,summary,difficulty';

      next();
    }
  );

  private createReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      if (!request.body.tourId) request.body.tourId = request.params.tourId;
      if (!request.body.userId) request.body.userId = request.user?.id;

      const review = await this.repository.create(request.body);
      // await new ReviewCreatedPublisher(natsInstance.client).publish({
      //   id: review.id,
      //   rating: review.rating,
      //   tourId: review.tourId,
      //   seq: 1,
      // });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        review,
        '리뷰를 생성했습니다.'
      );

      response.status(Code.CREATED.code).json(success);
    }
  );

  private deleteReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      const review = await this.repository.find({ _id: request.params.id });

      if (!review) {
        return next(
          new ReviewNotFoundError(
            Code.NOT_FOUND,
            '리뷰가 존재하지 않습니다.',
            true
          )
        );
      }

      if (review.userId != request.user?.id) {
        return next(
          new UnauthorizedReviewDeletionError(
            Code.FORBIDDEN,
            '리뷰를 작성하지 않았기에 삭제할 수 없습니다.',
            true
          )
        );
      }

      await this.repository.delete({ _id: request.params.id });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '리뷰를 삭제했습니다.'
      );

      response.status(Code.OK.code).json(success);
    }
  );

  private getReview = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      const review = await this.repository.find({ _id: request.params.id });

      if (!review) {
        return next(
          new ReviewNotFoundError(
            Code.NOT_FOUND,
            '리뷰가 존재하지 않습니다.',
            true
          )
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        review,
        '여행을 찾았습니다.'
      );

      response.status(Code.OK.code).json(success);
    }
  );

  private getReviews = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      const queryBuilder = new QueryBuilder(
        this.repository.findAll(),
        request.query
      )
        .filter()
        .sort()
        .project()
        .paginate();

      const reviews = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        reviews,
        '리뷰 목록을 찾았습니다.'
      );

      response.status(Code.OK.code).json(success);
    }
  );

  private updateReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      const review = await this.repository.find({ _id: request.params.id });

      if (!review) {
        return next(
          new ReviewNotFoundError(
            Code.NOT_FOUND,
            '리뷰가 존재하지 않습니다.',
            true
          )
        );
      }

      if (review.userId != request.user?.id) {
        return next(
          new UnauthorizedReviewDeletionError(
            Code.FORBIDDEN,
            '리뷰를 작성하지 않았기에 수정할 수 없습니다.',
            true
          )
        );
      }

      const updatedReview = await this.repository.update(
        { _id: request.params.id },
        request.body
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        updatedReview,
        '리뷰를 수정했습니다.'
      );

      response.status(Code.OK.code).json(success);
    }
  );
}
