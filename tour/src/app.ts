import fs from 'fs';
import { Server } from 'http';
import path from 'path';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoose from 'mongoose';
import morgan from 'morgan';
import xss from 'xss-clean';

import {
  CoreController,
  CoreApplication,
  errorMiddleware,
  natsInstance,
  PageNotFoundError,
  Code,
} from '@whooatour/common';

import { BookingCancelledSubscriber } from './event/subscriber/booking-cancelled.subscriber';
import { BookingMadeSubscriber } from './event/subscriber/booking-made.subscriber';
import { ReviewCreatedSubscriber } from './event/subscriber/review-created.subscriber';
import { ReviewDeletedSubscriber } from './event/subscriber/review-deleted.subscriber';
import { ReviewUpdatedSubscriber } from './event/subscriber/review-updated.subscriber';
import { UserBannedSubscriber } from './event/subscriber/user-banned.subscriber';
import { UserUnbannedSubscriber } from './event/subscriber/user-unbanned.subscriber';

export class TourApplication implements CoreApplication {
  public readonly app: express.Application;
  public readonly port: number;
  public readonly uri: string;

  constructor(controllers: CoreController[]) {
    this.app = express();
    this.port = process.env.PORT;
    this.uri = process.env.MONGO_URI;

    this.makeDirectory();
    this.connectToMessagingSystem();
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandler();
  }

  public listen(): Server {
    const server = this.app.listen(this.port, () => {
      console.log(`포트 ${this.port}에서 서버가 실행 중 입니다.`);
    });

    return server;
  }

  public async connectToMessagingSystem(): Promise<void> {
    await natsInstance.connect(
      process.env.NATS_CLUSTER_ID,
      process.env.NATS_CLIENT_ID,
      process.env.NATS_URL,
    );

    natsInstance.client.on('close', () => {
      console.log('NATS 연결이 종료되었습니다.');
      process.exit();
    });

    process.on('SIGINT', () => natsInstance.client.close());
    process.on('SIGTERM', () => natsInstance.client.close());

    new BookingCancelledSubscriber(natsInstance.client).subscribe();
    new BookingMadeSubscriber(natsInstance.client).subscribe();

    new ReviewCreatedSubscriber(natsInstance.client).subscribe();
    new ReviewDeletedSubscriber(natsInstance.client).subscribe();
    new ReviewUpdatedSubscriber(natsInstance.client).subscribe();

    new UserBannedSubscriber(natsInstance.client).subscribe();
    new UserUnbannedSubscriber(natsInstance.client).subscribe();
  }

  public async connectToDatabase(): Promise<void> {
    await mongoose.connect(this.uri);

    console.log('MongoDB에 연결되었습니다.');
  }

  public initializeControllers(controllers: CoreController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.router);
    });

    this.app.all(
      '*',
      (request: Request, response: Response, next: NextFunction) => {
        next(
          new PageNotFoundError(
            Code.NOT_FOUND,
            `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
          ),
        );
      },
    );
  }

  public initializeErrorHandler(): void {
    this.app.use(errorMiddleware);
  }

  /*
   * 미들웨어는 요청이나 응답 객체를 조작할 수 있는 함수이다. 요청과 응답 사이의 중간에 위치하기에 미들웨어라고 부른다.
   * 미들웨어 스택은 애플리케이션에서 사용하는 모든 미들웨어이다.
   * 매우 중요한 점은 미들웨어 스택 내에서 미들웨어의 순서는 코드에서 미들웨어가 정의된 순서와 같다는 것이다.
   * 코드에서 처음으로 나타나는 미들웨어는 나중에 나타나는 미들웨어보다 먼저 실행된다.
   * 전체 과정은 생성된 요청/응답 객체가 각 미들웨어를 통해 통과되어 처리되며 각 미들웨어 함수의 끝에서 다음 함수가 호출된다.
   * 즉, next() 함수를 호출할 때 미들웨어 스택 내의 다음 미들웨어가 실행된다. 이 과정은 마지막 미들웨어에 도달할 때까지 반복된다.
   * 마지막 미들웨어 함수는 next() 함수를 호출하지 않으며 응답을 전송한다.
   *
   * 요청-응답 주기.
   * 요청 -> 미들웨어 스택의 모든 미들웨어 -> 응답
   *
   * 미들웨어를 사용하기 위해 express.use() 함수를 사용한다.
   */
  public initializeMiddlewares(): void {
    this.app.set('trust proxy', 1);

    this.app.use(helmet());

    const limiter = rateLimit({
      max: 100,
      windowMs: 60 * 60 * 1000,
      message:
        '해당 IP 주소에서 너무 많은 요청을 보냈습니다. 1시간 후에 다시 시도하세요.',
    });

    this.app.use('/api', limiter);

    this.app.use(mongoSanitize());

    this.app.use(xss());

    this.app.use(
      hpp({
        whitelist: [
          'duration',
          'ratingsAverage',
          'ratingsCount',
          'price',
          'difficulty',
          'groupSize',
        ],
      }),
    );

    /* body-parser: https://assu10.github.io/dev/2021/12/01/nodejs-express-1 */
    this.app.use(bodyParser.json());
    this.app.use(cors());
    /* cookie-parser: https://assu10.github.io/dev/2021/12/01/nodejs-express-1/ */
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
      /* morgan: https://assu10.github.io/dev/2021/12/01/nodejs-express-1 */
      this.app.use(morgan('dev'));
    }

    this.app.use(express.static(path.join(__dirname, './', 'public')));
  }

  public makeDirectory(): void {
    if (!fs.existsSync(process.env.IMAGE_DIRECTORY_PATH)) {
      console.error('사용자 이미지 디렉터리가 존재하지 않으므로 생성합니다.');
      fs.mkdirSync(process.env.IMAGE_DIRECTORY_PATH, { recursive: true });
    }
  }
}
