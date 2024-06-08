import { Server } from 'http';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';

import { AbstractController, errorMiddleware } from '@whooatour/common';

// TODO: AbstractApplication 생성 다음 상속.
export class App {
  private readonly app: express.Application;
  private readonly port: number;
  private readonly uri: string;

  constructor(controllers: AbstractController[], port: number, uri: string) {
    this.app = express();
    this.port = port;
    this.uri = uri;

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

  private initializeMiddlewares(): void {
    this.app.use(bodyParser.json());
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }

  // TODO: 404 페이지 경로는 하나로 합치기.
  private initializeControllers(controllers: AbstractController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.router);
    });
  }

  private connectToDatabase(): void {
    mongoose.connect(this.uri);
  }

  private initializeErrorHandler(): void {
    this.app.use(errorMiddleware);
  }
}
