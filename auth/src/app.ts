import fs from 'fs';
import { Server } from 'http';

import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

import {
  CoreApplication,
  CoreController,
  errorMiddleware,
} from '@whooatour/common';

export class AuthApplication implements CoreApplication {
  public readonly app: express.Application;
  public readonly port: number;
  public readonly uri: string;

  constructor(controllers: CoreController[], port: number, uri: string) {
    this.app = express();
    this.port = port;
    this.uri = uri;

    this.makeDirectory();
    this.connectToDatabase();
    this.initializeMiddlewares();
    this.initializeControllers(controllers);
    this.initializeErrorHandler();
  }

  public listen(): Server {
    const server = this.app.listen(this.port, () => {
      console.log(`포트 ${this.port}에서 서버가 실행 중입니다.`);
    });
    return server;
  }

  public async connectToMessagingSystem(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async connectToDatabase(): Promise<void> {
    await mongoose.connect(this.uri);

    console.log('MongoDB에 연결되었습니다.');
  }

  public initializeMiddlewares(): void {
    // TODO: Kubernetes 및 express-rate-limit 패키지 오류 해결.
    // https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
    // this.express.set('trust proxy', true);

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
     * 사용자 입력에서 악성 HTML 코드를 제거한다. 즉, HTML 기호를 변환하여 XSS 공격을 방지한다.
     */
    this.app.use(xss());

    /* 매개변수 오염을 방지한다. */
    this.app.use(
      hpp({
        /* 쿼리 문자열에서 중복을 허용하는 화이트 리스트 */
        whitelist: ['name'],
      }),
    );

    this.app.use(bodyParser.json());
    /*
     * cookie-parser 모듈은 요청에 있는 쿠키를 해석하여 req.cookies 객체로 만드는 미들웨어이다.
     * 유효기간이 지난 쿠키는 자동으로 거른다.
     * 인자로 비밀키를 넣어줄 수 있는데 서명된 쿠키가 있는 경우 제공한 비밀키를 통해 해당 쿠키가 내 서버에서 만든 쿠키임을 검증할 수 있다.
     * 쿠키는 클라이언트에서 위조하기 쉽기 때문에 비밀키를 통해 만들어낸 서명을 쿠키 값 뒤에 붙이는데 서명이 붙은 쿠키는 name=chang.sign 과 같은 모양이다.
     * 서명된 쿠키는 req.cookie 객체대신 req.signedCookies 객체에 들어간다.
     * cookie-parser 모듈은 쿠키를 생성할 때 쓰는게 아니라 쿠키를 해석하여 req 객체에 넣어주는 역할이다.
     * 쿠키를 생성/제거할 때는 res.cookie, res.clearCookie 메서드를 사용한다.
     * signed 옵션을 true 로 설정 시 쿠키 뒤에 서명이 붙는다.
     * 서버에서 만든 쿠키임을 검증할 수 있으므로 대부분의 경우 서명 옵션을 활성화하는 것이 좋다.
     */
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }

  // TODO: 404 페이지 경로는 하나로 합치기.
  public initializeControllers(controllers: CoreController[]): void {
    controllers.forEach((controller) => {
      this.app.use(controller.router);
    });
  }

  public initializeErrorHandler(): void {
    this.app.use(errorMiddleware);
  }

  public makeDirectory(): void {
    if (!fs.existsSync(process.env.IMAGE_DIRECTORY_PATH)) {
      console.error('사용자 이미지 디렉터리가 존재하지 않으므로 생성합니다.');
      fs.mkdirSync(process.env.IMAGE_DIRECTORY_PATH, { recursive: true });
    }
  }
}
