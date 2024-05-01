import { Router, NextFunction, Request, Response } from 'express';

import {
  ApiResponse,
  Code,
  AbstractController,
  QueryBuilder,
  QueryRequest,
  validationMiddleware,
  catchAsync,
} from '@whooatour/common';

import { Tour } from '../model/tour.model';
import { TourValidator } from '../util/tour-validator';
import { TourRepository } from '../repository/tour.repository';
import { TourNotFoundError } from '../error/tour-not-found.error';

export class TourController extends AbstractController {
  public readonly path = '/api/v1/tours';
  public readonly router = Router();
  public readonly repository = new TourRepository(Tour);

  constructor() {
    super();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    /* 매개변수 미들웨어는 특정 매개변수에 대해서만 실행되는 미들웨어이다. 즉, URL에 특정 매개변수를 가지고 있을 때 실행된다. */
    // this.router.param('id');

    /*
     * 미들웨어를 사용해서 쿼리 문자열의 특정 필드를 채울 수 있다.
     * 컨트롤러 호출 전 미들웨어를 실행한다.
     */
    this.router
      .route(`${this.path}/top5`)
      .get(this.aliasTopTours, this.getTours);

    this.router.route(`${this.path}/statistics`).get(this.getStatistics);

    this.router.route(`${this.path}/monthly-plan`).get(this.getMonthlyPlan);

    this.router
      .route(this.path)
      .get(this.getTours)
      .post(...validationMiddleware(TourValidator.create()), this.createTour);

    this.router
      .route(`${this.path}/:id`)
      .get(this.getTour)
      .patch(this.updateTour)
      .delete(this.deleteTour);

    this.router.all('*', this.handleRoutes);
  }

  private handleRoutes = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const error = {
      codeAttr: Code.NOT_FOUND,
      detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
      isOperational: true,
    };

    next(error);
  };

  private getTours = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /*
       * 쿼리 작성 방법.
       * 1. 필터.
       * 2. 체이닝.
       *
       * const tours = await Tour.find({
       *   duration: 3,
       *   difficulty: '상',
       * });
       *
       * const tours = await Tour.find()
       *   .where('duration')
       *   .equals(3)
       *   .where('difficulty')
       *   .equals('상');
       */

      const queryBuilder = new QueryBuilder(
        this.repository.findAll(),
        request.query,
      )
        .filter()
        .sort()
        .project()
        .paginate();

      const tours = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tours,
        '여행 목록을 찾았습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getTour = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /*
       * findById() 메서드는 내부적으로 findOne() 메서드를 사용한다.
       * 즉, Tour.findOne({ _id: req.params.id })
       */
      const tour = await this.repository.find({ _id: request.params.id });

      if (!tour) {
        return next(
          new TourNotFoundError(
            Code.NOT_FOUND,
            '여행이 존재하지 않습니다.',
            true,
          ),
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tour,
        '여행을 찾았습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private createTour = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
      const tour = await this.repository.create(request.body);

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        tour,
        '여행을 생성했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  private updateTour = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
      const tour = await this.repository.update(
        { _id: request.params.id },
        request.body,
      );

      if (!tour) {
        return next(
          new TourNotFoundError(
            Code.NOT_FOUND,
            '여행이 존재하지 않습니다.',
            true,
          ),
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tour,
        '여행을 갱신했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private deleteTour = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
      const tour = await this.repository.delete({ _id: request.params.id });

      if (!tour) {
        return next(
          new TourNotFoundError(
            Code.NOT_FOUND,
            '여행이 존재하지 않습니다.',
            true,
          ),
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        null,
        '여행을 삭제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private aliasTopTours = catchAsync(
    async (request: Request, response: Response, next: NextFunction) => {
      request.query.limit = '5';
      request.query.sort = '-ratingAverage,price';
      request.query.fields = 'name,price,ratingAverage,summary,difficulty';

      next();
    },
  );

  private getStatistics = catchAsync(
    async (request: Request, response: Response) => {
      /*
       * 집계 파이프라인(aggregate pipeline)은 특정 컬렉션의 모든 도큐먼트가 통과하는 파이프라인을 정의한다.
       * 도큐먼트는 단계별로 처리되며 집계된 결과물로 변환된다. MongoDB 데이터베이스의 기능 중 하나이다.
       * 일반적인 쿼리와 비슷하며 집계 파이프라인에서 단계 배열을 통해 데이터를 조작한다.
       */
      const statistics = await this.repository.aggregate([
        {
          /* match는 도큐먼트를 선택 및 필터링한다. */
          $match: { ratingAverage: { $gte: 2.0 } },
        },
        /* group은 누산기를 사용해 도큐먼트를 그룹화한다. */
        {
          $group: {
            /* 필드를 기준으로 결과를 그룹화할 수 있다. */
            _id: { $toUpper: '$difficulty' },
            /* 집계 파이프라인을 통과하는 각 도큐먼트에 대해 countTour에 1이 추가된다.*/
            countTour: { $sum: 1 },
            countRating: { $sum: '$ratingCount' },
            averageRating: { $avg: '$ratingAverage' },
            averagePrice: { $avg: '$price' },
            minimumPrice: { $min: '$price' },
            maximumPrice: { $max: '$price' },
          },
        },
        {
          $addFields: { difficulty: '$_id' },
        },
        {
          $project: { _id: 0 },
        },
        /* group에서 그룹화한 필드 이름만 사용할 수 있다. 이전 이름은 사라져서 사용할 수 없다. */
        { $sort: { averagePrice: 1 } },
      ]);

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        statistics,
        '여행의 통계를 구했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMonthlyPlan = catchAsync(
    async (request: Request, response: Response) => {
      const year = +request.params.year;

      const plan = await this.repository.aggregate([
        /* $unwind는 도큐먼트에서 입력 배열 필드를 해체하고 배열의 각 원소에 대해 하나의 도큐먼트를 출력한다. */
        { $unwind: '$startDate' },
        {
          $match: {
            startDate: {
              $gte: new Date(`${year}-01-01`),
              $lte: new Date(`${year}-12-31`),
            },
          },
        },
        {
          $group: {
            _id: { $month: '$startDate' },
            countTourStart: { $sum: 1 },
            tours: { $push: '$name' },
          },
        },
        {
          $addFields: { month: '$_id' },
        },
        {
          $project: {
            _id: 0,
          },
        },
        {
          $sort: { countTourStart: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        plan,
        '매월 여행의 계획을 구했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
}
