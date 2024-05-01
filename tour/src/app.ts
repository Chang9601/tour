import { Server } from 'http';

import bodyParser from 'body-parser';
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

  /*
   * 미들웨어는 요청이나 응답 객체를 조작할 수 있는 함수이다. 요청과 응답 사이의 중간에 위치하기에 미들웨어라고 부른다.
   * 미들웨어 스택은 애플리케이션에서 사용하는 모든 미들웨어이다.
   * 매우 중요한 점은 미들웨어 스택 내에서 미들웨어의 순서는 코드에서 미들웨어가 정의된 순서와 같다는 것이다.
   * 코드에서 처음으로 나타나는 미들웨어는 나중에 나타나는 미들웨어보다 먼저 실행된다.
   * 전체 과정은 생성된 요청/응답 객체가 각 미들웨어를 통해 통과되어 처리되며 각 미들웨어 함수의 끝에서 다음 함수가 호출된다.
   * 즉, next() 함수를 호출할 때 미들웨어 스택 내의 다음 미들웨어가 실행된다. 이 과정은 마지막 미들웨어에 도달할 때까지 반복된다.
   * 마지막 미들웨어 함수는 다음 함수를 호출하지 않으며 응답을 전송한다.
   *
   * 요청-응답 주기.
   * 요청 -> 미들웨어 스택의 모든 미들웨어 -> 응답
   *
   * 미들웨어를 사용하기 위해 app.use() 함수를 사용한다.
   */
  private initializeMiddlewares(): void {
    /*
     * body-parser 모듈의 json() 메서드는 요청 본문에 있는 데이터를 해석하여 request.body 객체로 만들어주는 미들웨어이다.
     * 단, 이미지, 동영상, 파일과 같은 멀티파트 데이터는 처리하지 못하며 multer 모듈을 사용한다.
     * 4.16.0 부터 body-parser 모듈의 일부 기능이 express 모듈에 내장되어 따로 설치할 필요는 없지만 버퍼나 텍스트 형식의 데이터 처리시엔 따로 설치해서 사용해서 한다.
     * body-parser 모듈은 JSON, URL-encoded 형식 외 Raw, Text 형식의 데이터도 추가로 해석할 수 있는데 Raw는 요청의 본문이 버퍼 데이터인 경우 Text는 텍스트 데이터일 경우이다.
     */
    this.app.use(bodyParser.json());
    if (process.env.NODE_ENV === 'development') {
      /*
       * morgan 모듈은 요청과 응답에 대한 정보를 콘솔에 기록하는 미들웨어이다.
       * 개발 환경에서는 dev, 배포 환경에서는 combined 를 사용한다.
       */
      this.app.use(morgan('dev'));
    }
  }

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
