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
  authorizationMiddleware,
  UserRole,
  multerInstance,
  natsInstance,
} from '@whooatour/common';

import { TourCreatedPublisher } from '../event/publisher/tour-created.publisher';
import { Tour } from '../model/tour.model';
import { TourRepository } from '../repository/tour.repository';
import { TourValidator } from '../util/tour-validator';

multerInstance.initialize(process.env.IMAGE_DIRECTORY_PATH, 'tour', 'image');

export class TourController implements CoreController {
  public readonly path = '/api/v1/tours';
  public readonly adminPath = '/api/v1/admin/tours';
  public readonly router = Router();
  public readonly repository = new TourRepository(Tour);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    /* 매개변수 미들웨어는 특정 매개변수에 대해서만 실행되는 미들웨어이다. 즉, URL에 특정 매개변수를 가지고 있을 때 실행된다. */
    // this.router.param('id');

    /*
     * 미들웨어를 사용해서 쿼리 문자열의 특정 필드를 채울 수 있다.
     * 컨트롤러 호출 전 미들웨어를 실행한다.
     */
    this.router.route(`${this.path}/monthly-plan`).get(this.getMonthlyPlan);

    this.router.route(`${this.path}/statistics`).get(this.getStatistics);

    this.router
      .route(`${this.path}/tours-within/:distance/center/:latlng/:unit`)
      .get(this.getToursWithin);

    this.router
      .route(`${this.path}/distances/:latlng/unit/:unit`)
      .get(this.getDistances);

    this.router.route(`${this.path}/:id`).get(this.getTour);

    this.router
      .route(`${this.path}/top5`)
      .get(this.aliasTopTours, this.getTours);

    this.router.route(`${this.path}`).get(this.getTours);

    /* 관리자 경로 */
    this.router
      .route(this.adminPath)
      .post(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        ...validationMiddleware(TourValidator.create()),
        this.createTour,
      );

    this.router
      .route(`${this.adminPath}/:id`)
      .delete(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.deleteTour,
      )
      .patch(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.uploadImage,
        ...validationMiddleware(TourValidator.update()),
        this.updateTour,
      );

    this.router.all('*', this.handleRoutes);
  };

  public handleRoutes = async (
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

  private aliasTopTours = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      request.query.limit = '5';
      request.query.sort = '-ratingAverage,price';
      request.query.fields = 'name,price,ratingAverage,summary,difficulty';

      next();
    },
  );

  private getDistances = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { latlng, unit } = request.params;

      const [lat, lng] = latlng.split(',');

      if (!lat || !lng) {
        next();
      }

      const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
      const distances = await this.repository.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: 'distance',
            distanceMultiplier: multiplier,
          },
        },
        {
          $project: {
            distance: 1,
            name: 1,
          },
        },
      ]);

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        distances,
        '거리 안에 존재하는 여행 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMonthlyPlan = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
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

  private getStatistics = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
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

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tour,
        '여행을 찾았습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

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
        '여행 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  /* /tours-within/233/center/34.11145,-118.113491/unit/mi */
  private getToursWithin = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { latlng, unit } = request.params;
      const distance = parseFloat(request.params.distance);

      const [lat, lng] = latlng.split(',');

      const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

      if (!lat || !lng) {
        next();
      }

      const tours = await this.repository.findAll({
        sourceLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tours,
        '거리 안에 존재하는 여행 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  /* 관리자 API */
  private createTour = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const tour = await this.repository.create(request.body);

      await new TourCreatedPublisher(natsInstance.client).publish({
        id: tour.id,
        difficulty: tour.difficulty,
        duration: tour.duration,
        groupSize: tour.groupSize,
        name: tour.name,
        price: tour.price,
        sequence: tour.sequence,
      });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        tour,
        '여행을 생성했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  private deleteTour = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await this.repository.delete({ _id: request.params.id });

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '여행을 삭제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private updateTour = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.files) {
        const files = request.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        const coverImage = files.coverImage;
        // TODO: 여러 이미지는 어떻게?
        const images = files.images;

        request.body.coverImage = coverImage[0].filename;
        request.body.images = images;
      }

      const tour = await this.repository.update(
        { _id: request.params.id },
        { ...request.body, updatedAt: Date.now() },
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        tour,
        '여행을 수정했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private uploadImage = multerInstance.multer.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 3 },
  ]);
}
