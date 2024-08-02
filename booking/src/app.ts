import { Server } from 'http';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import hpp from 'hpp';

import {
  CoreController,
  CoreApplication,
  errorMiddleware,
  //natsInstance,
} from '@whooatour/common';

export class ReviewApplication implements CoreApplication {
  public readonly app: express.Application;
  public readonly port: number;
  public readonly uri: string;

  constructor(controllers: CoreController[], port: number, uri: string) {
    this.app = express();
    this.port = port;
    this.uri = uri;

    this.connectToMessagingSystem();
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandler();
  }

  public listen(): Server {
    const server = this.app.listen(this.port, () => {
      console.log(`포트 ${this.port}에서 서버 실행 중.`);
    });

    return server;
  }

  public async connectToMessagingSystem(): Promise<void> {
    // await natsInstance.connect(
    //   process.env.NATS_CLUSTER_ID,
    //   process.env.NATS_CLIENT_ID,
    //   process.env.NATS_URL
    // );
    // /*
    //  * 공통 모듈에서 예외를 적용하면 한 서비스로 인해 모든 서비스가 종료될 수 있다.
    //  * 따라서, 여기서 예외를 처리한다.
    //  */
    // natsInstance.client.on('close', () => {
    //   console.log('NATS 연결 종료.');
    //   process.exit();
    // });
    // process.on('SIGINT', () => natsInstance.client.close());
    // process.on('SIGTERM', () => natsInstance.client.close());
  }

  public async connectToDatabase(): Promise<void> {
    await mongoose.connect(this.uri);

    console.log('MongoDB 연결 완료.');
  }

  public initializeMiddlewares(): void {
    this.app.use(bodyParser.json());
    this.app.use(cookieParser());

    this.app.use(
      hpp({
        whitelist: ['title', 'content', 'rating'],
      })
    );

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }

  public initializeControllers(controllers: CoreController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.router);
    });
  }

  public initializeErrorHandler(): void {
    this.app.use(errorMiddleware);
  }
}
