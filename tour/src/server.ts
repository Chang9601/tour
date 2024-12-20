import * as dotenv from 'dotenv';

import { TourApplication } from './app';
import { TourController } from './controller/tour.controller';
import { validateEnv } from './util/env-validator';

/*
 * 잡히지 않은 예외'(uncaught exceptions)는 동기 코드에서 발생하지만 어디에서도 처리되지 않은 오류이다.
 * 다른 모든 코드가 실행되기 전에 있어야 하므로 최상위에 위치한다.
 */
process.on('uncaughtException', (error: Error) => {
  console.log('처리하지 오류로 인해 프로세스가 종료됩니다.');
  console.log(error);

  process.exit(1);
});

/*
 * dotenv 패키지는 .env 파일을 읽어서 process.env로 만든다.
 * NodeJS 프로세스 파일 읽기는 한 번 발생한다.
 */
dotenv.config({
  path: '.env',
});

validateEnv();

const tourApplication = new TourApplication([new TourController()]);

const server = tourApplication.listen();

/*
 * 처리되지 않은 프로미스 거부(unhandledRejection)는 프로미스가 거부되었지만 어디에서도 처리되지 않았다는 뜻이다.
 * 처리되지 않은 프로미스 거부가 발생할 때마다 프로세스는 unhandled rejection 이벤트를 방출한다.
 * 처리되지 않은 프로미스 거부 이벤트를 감지하고 이를 통해 이전에 처리되지 않은 비동기 코드에서 발생하는 모든 오류를 처리할 수 있다.
 */
process.on('unhandledRejection', (error: Error) => {
  console.log('처리하지 프로미스 거부로 인해 프로세스가 종료됩니다.');
  console.log(error);

  /* 서버가 현재 처리 중이거나 대기 중인 모든 요청을 완료할 시간을 주고 그 후에 서버를 종료한다. */
  server.close(() => {
    process.exit(1);
  });
});
