import { Server } from 'http';

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
import { UserBannedSubscriber } from './event/subscriber/user-banned.subscriber';
import { UserUnbannedSubscriber } from './event/subscriber/user-unbanned.subscriber';

export class PaymentApplication implements CoreApplication {
  public readonly app: express.Application;
  public readonly port: number;
  public readonly uri: string;

  constructor(controllers: CoreController[]) {
    this.app = express();
    this.port = process.env.PORT;
    this.uri = process.env.MONGO_URI;

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
    /*
     * 공통 모듈에서 예외를 적용하면 한 서비스로 인해 모든 서비스가 종료될 수 있다.
     * 따라서, 여기서 예외를 처리한다.
     */
    natsInstance.client.on('close', () => {
      console.log('NATS 연결이 종료되었습니다.');
      process.exit();
    });

    process.on('SIGINT', () => natsInstance.client.close());
    process.on('SIGTERM', () => natsInstance.client.close());

    new BookingCancelledSubscriber(natsInstance.client).subscribe();
    new BookingMadeSubscriber(natsInstance.client).subscribe();

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
        whitelist: ['title', 'content', 'rating'],
      }),
    );

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    this.app.use(bodyParser.json());
    this.app.use(cors());
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }
}
