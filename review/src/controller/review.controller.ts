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
  natsInstance,
  authorizationMiddleware,
  UserRole,
  UnauthorizedUserError,
} from '@whooatour/common';

import { TourNotFoundError } from '../error/tour-not-found.error';
import { ReviewCreatedPublisher } from '../event/publisher/review-created.publisher';
import { ReviewDeletedPublisher } from '../event/publisher/review-deleted.publisher';
import { ReviewUpdatedPublisher } from '../event/publisher/review-updated.publisher';
import { Review } from '../model/review.model';
import { Tour } from '../model/tour.model';
import { redis } from '../redis/redis';
import { ReviewRepository } from '../repository/review.repository';
import { ReviewValidator } from '../util/review-validator';

export class ReviewController implements CoreController {
  public readonly path = '/api/v1/reviews';
  public readonly adminPath = '/api/v1/admin/reviews';
  public readonly router = Router();
  public readonly repository = new ReviewRepository(Review);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    // TODO: 경로를 수정하여 여행 컨트롤러로 전달되는거 방지.
    this.router.get(`/api/v1/tours/:tourId/reviews`, this.getReviewsByTour);

    this.router.get(`${this.path}/:id`, this.getReview);

    this.router.get(this.path, this.getReviews);

    this.router.get(
      `/api/v1/tours/:tourId/reviews/top`,
      this.aliasTopReviews,
      this.getReviewsByTour,
    );

    this.router.use(authenticationMiddleware(redis));

    this.router
      .route(`/api/v1/tours/:tourId/reviews`)
      .post(
        ...validationMiddleware(ReviewValidator.create()),
        this.createMyReview,
      );

    this.router
      .route(`${this.path}/:id`)
      .delete(this.deleteMyReview)
      .patch(
        ...validationMiddleware(ReviewValidator.update()),
        this.updateMyReview,
      );

    /* 관리자 경로 */
    this.router.use(authorizationMiddleware(UserRole.Admin));

    this.router
      .route(`${this.adminPath}/:id`)
      .delete(this.deleteReview)
      .patch(
        ...validationMiddleware(ReviewValidator.update()),
        this.updateReview,
      );
  };

  // TODO: 좋아요/싫어요 추가
  private aliasTopReviews = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      request.query.limit = '5';
      request.query.sort = '-ratingsAverage';
      request.query.fields = 'name,price,ratingsAverage,summary,difficulty';

      next();
    },
  );

  private createMyReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 리뷰를 작성할 수 있는 권한이 없습니다.',
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

      request.body.tour = tour;

      const review = await this.repository.create(request.body);

      /*
       * 도큐먼트에 대한 생성/수정/삭제 이벤트를 설명하기 위해 해당 도규먼트에 대한 이벤트를 주요 서비스가 발행할 때마다
       * 버전 번호를 증가시키거나 포함한다.
       */
      const { ratingsAverage, ratingsCount } =
        await Review.calculateAverageRating(review.tour._id);

      console.log(ratingsAverage);
      console.log(ratingsCount);

      await new ReviewCreatedPublisher(natsInstance.client).publish({
        id: review.id,
        rating: review.rating,
        ratingsAverage,
        ratingsCount,
        tour: {
          id: review.tour.id,
          name: review.tour.name,
        },
        sequence: review.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        review,
        '리뷰를 생성했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  private deleteMyReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 리뷰를 작성할 수 있는 권한이 없습니다.',
          ),
        );
      }

      const review = await this.repository.findOne({
        _id: request.params.id,
      });

      // TODO: !== 오류 발생.
      if (review.userId != request.user!.id) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '리뷰를 삭제할 수 있는 권한이 없습니다.',
          ),
        );
      }

      /* OCC를 실행하기 위해서 save() 메서드를 호출한다. */
      await review.save();

      await this.repository.delete({
        _id: request.params.id,
      });

      const { ratingsAverage, ratingsCount } =
        await Review.calculateAverageRating(review.tour._id);

      await new ReviewDeletedPublisher(natsInstance.client).publish({
        id: review.id,
        ratingsAverage,
        ratingsCount,
        tour: {
          id: review.tour.id,
        },
        sequence: review.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '리뷰를 삭제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getReview = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const review = await this.repository.findOne({
        _id: request.params.id,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        review,
        '여행을 찾았습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getReviews = catchAsync(
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

      const reviews = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        reviews,
        '리뷰 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getReviewsByTour = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const queryBuilder = new QueryBuilder(
        this.repository.find({ tour: request.params.tourId }),
        request.query,
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
        '리뷰 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private updateMyReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 리뷰를 작성할 수 있는 권한이 없습니다.',
          ),
        );
      }

      const review = await this.repository.findOne({
        _id: request.params.id,
      });

      if (review.userId != request.user!.id) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '리뷰를 수정할 수 있는 권한이 없습니다.',
          ),
        );
      }

      const { content, title, rating } = request.body;

      review.set({
        content: content ? content : review.content,
        title: title ? title : review.title,
        rating: rating ? rating : review.rating,
      });

      await review.save();

      const { ratingsAverage, ratingsCount } =
        await Review.calculateAverageRating(review.tour._id);

      await new ReviewUpdatedPublisher(natsInstance.client).publish({
        id: review.id,
        rating: review.rating,
        ratingsAverage,
        ratingsCount,
        tour: {
          id: review.tour.id,
        },
        sequence: review.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        review,
        '리뷰를 수정했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private deleteReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const review = await this.repository.findOne({ _id: request.params.id });

      await review.save();

      await this.repository.delete({ _id: request.params.id });

      const { ratingsAverage, ratingsCount } =
        await Review.calculateAverageRating(review.tour._id);

      await new ReviewDeletedPublisher(natsInstance.client).publish({
        id: review.id,
        ratingsAverage,
        ratingsCount,
        tour: {
          id: review.tour.id,
        },
        sequence: review.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '리뷰를 삭제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private updateReview = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const review = await this.repository.findOne({ _id: request.params.id });

      const { content, title, rating } = request.body;

      review.set({
        content: content ? content : review.content,
        title: title ? title : review.title,
        rating: rating ? rating : review.rating,
      });

      await review.save();

      const { ratingsAverage, ratingsCount } =
        await Review.calculateAverageRating(review.tour._id);

      await new ReviewUpdatedPublisher(natsInstance.client).publish({
        id: review.id,
        rating: review.rating,
        ratingsAverage,
        ratingsCount,
        tour: {
          id: review.tour.id,
        },
        sequence: review.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        review,
        '리뷰를 수정했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
}
