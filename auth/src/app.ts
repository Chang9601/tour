import fs from 'fs';
import { Server } from 'http';
import path from 'path';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import cron from 'node-cron';
import express, { NextFunction, Request, Response } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoose from 'mongoose';
import morgan from 'morgan';
import xss from 'xss-clean';

import {
  Code,
  CoreApplication,
  CoreController,
  errorMiddleware,
  natsInstance,
  PageNotFoundError,
} from '@whooatour/common';

export class AuthApplication implements CoreApplication {
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
    this.runCronJobs();
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
    // https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
    this.app.set('trust proxy', 1);

    /* 보안 HTTP 헤더를 설정한다. */
    this.app.use(helmet());

    /*
     * 1시간에 동일 IP 주소에서 100개의 요청을 허용한다.
     * 제한기는 서비스 거부 공격(DoS)과 브루트 포스 공격을 예방한다.
     * 즉, 공격자가 브루트 포스를 사용하여 사용자의 비밀번호를 추측하려고 시도하는 것을 의미한다.
     */
    const limiter = rateLimit({
      max: 100,
      windowMs: 60 * 60 * 1000,
      message:
        '해당 IP 주소에서 너무 많은 요청을 보냈습니다. 1시간 후에 다시 시도하세요.',
    });

    /* /api로 시작하는 URL에만 제한기를 적용한다. */
    this.app.use('/api', limiter);

    /*
     * NoSQL 쿼리 주입 공격에 대비한 데이터 위생처리를 적용한다.
     * 본문, 쿼리 문자열 그리고 경로 매개변수를 확인하여 모든 달러 기호와 점을 걸러낸다.
     */
    this.app.use(mongoSanitize());

    /*
     * XSS 공격에 대비한 데이터 위생처리를 적용한다.
     * 사용자 입력에서 악성 HTML 코드를 제거한다.
     * 즉, HTML 기호를 변환하여 XSS 공격을 방지한다.
     */
    this.app.use(xss());

    /* 매개변수 오염을 방지한다. */
    this.app.use(
      hpp({
        /* 쿼리 문자열에서 중복을 허용하는 화이트 리스트 */
        whitelist: ['name', 'email', 'userRole'],
      }),
    );

    this.app.use(bodyParser.json());
    this.app.use(cors());
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
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

  public runCronJobs(): void {
    cron.schedule(
      '* * * * *',
      async () => {
        await mongoose.connection.db
          .collection('users')
          .deleteMany({ active: false });
      },
      {
        scheduled: true,
        timezone: 'Asia/Seoul',
      },
    );
  }
}
